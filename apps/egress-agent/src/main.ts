import type {
  AgentFetchRequest,
  DownloadOptions,
  EgressAgentStatus,
  EgressCheckFacts,
  YoutubeSource
} from '@playliberty/youtube';
import {
  YoutubeSponsorBlockError,
  YoutubeVideoUnavailableError,
  YtdlpFetcher
} from '@playliberty/youtube';

import { checkActive } from './agent/check/check.js';
import { readExitIp } from './agent/exitIp.js';
import { readHandshake } from './agent/handshake.js';
import { ChildRegistry } from './agent/processes/processes.js';
import { startAgent } from './agent/server/server.js';
import { readActiveState, writeActiveState } from './agent/state/state.js';
import { resolveActive } from './agent/status.js';
import {
  DEFAULT_DRAIN_TIMEOUT_MS,
  SwitchInterruptedError,
  switchTo
} from './agent/switch/switch.js';
import { applyConfig } from './agent/wireguard/wireguard.js';
import { logger } from './logging/logger.js';
import { readPool } from './pool/pool.js';

const DEFAULT_SOCKET = '/run/playliberty/egress-agent.sock';
const DEFAULT_PEER_UID = 1000;
const DEFAULT_STATE_FILE = '/var/lib/playliberty-egress/active';
const DEFAULT_VETH_NAME = 'pl-egress1';
const DEFAULT_VETH_HOST_IP = '10.200.0.1';
const DEFAULT_CHECK_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const DEFAULT_EXIT_IP_URL = 'https://api.ipify.org';
const DEFAULT_CHECK_TIMEOUT_MS = 60_000;
const DEFAULT_HANDSHAKE_FRESH_MS = 180_000;

/* `listSource` never reads the download options; the check only lists. The
 * download path gets the server's options per request from ticket 05. */
const CHECK_DOWNLOAD: DownloadOptions = {
  concurrency: 1,
  sleepRequests: 1,
  sleepIntervalMin: 5,
  sleepIntervalMax: 15,
  limitRate: '5M',
  retries: 1,
  fragmentRetries: 1,
  fileAccessRetries: 1,
  socketTimeout: 30
};

function required(name: string, value: string | undefined): string {
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];

  if (raw === undefined || raw.length === 0) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return value;
}

/* A switch kills what it drains; the route must answer `switching` rather than
 * blame the source for a gone video it happened to be reading. */
function isSourceError(error: unknown): boolean {
  return (
    error instanceof YoutubeVideoUnavailableError ||
    error instanceof YoutubeSponsorBlockError
  );
}

async function main(): Promise<void> {
  const poolDirectory = required(
    'PROTON_POOL_DIR',
    process.env.PROTON_POOL_DIR
  );
  const socketPath = process.env.EGRESS_AGENT_SOCKET ?? DEFAULT_SOCKET;
  const stateFile = process.env.EGRESS_STATE_FILE ?? DEFAULT_STATE_FILE;
  const peerUid = Number.parseInt(
    process.env.EGRESS_AGENT_PEER_UID ?? String(DEFAULT_PEER_UID),
    10
  );

  if (!Number.isInteger(peerUid) || peerUid < 0) {
    throw new Error('EGRESS_AGENT_PEER_UID must be a non-negative integer.');
  }

  const interfaceName = process.env.WG_INTERFACE ?? null;
  const vethName = process.env.EGRESS_VETH_NS ?? DEFAULT_VETH_NAME;
  const vethHostIp = process.env.EGRESS_VETH_HOST_IP ?? DEFAULT_VETH_HOST_IP;
  const children = new ChildRegistry();
  const pool = await readPool(poolDirectory);
  const remembered = await readActiveState(stateFile);
  const state = {
    active: resolveActive(pool, remembered, process.env.PROTON_ACTIVE_CONFIG),
    loadedSince: new Date().toISOString()
  };

  /* A failed write leaves the interface where it is; the state file keeps the
   * last name it could write, and the journal says why. */
  const persistActive = async (name: string): Promise<void> => {
    try {
      await writeActiveState(stateFile, name);
    } catch (error) {
      logger.error(
        { err: error, event: 'active_state_write_failed' },
        'active state write failed'
      );
    }
  };

  const status = async (): Promise<EgressAgentStatus> => ({
    pool: await readPool(poolDirectory),
    active: state.active,
    loadedSince: state.loadedSince
  });

  const localApplyConfig = (
    name: string,
    drainTimeoutMs: number = DEFAULT_DRAIN_TIMEOUT_MS
  ): Promise<void> =>
    switchTo(
      name,
      {
        poolDirectory,
        interfaceName,
        registry: children,
        apply: next =>
          applyConfig(
            {
              interfaceName,
              poolDirectory,
              vethName,
              vethHostIp,
              previousEndpoint:
                pool.find(config => config.name === state.active)?.endpoint ??
                null
            },
            next
          ),
        onSwitched: async next => {
          state.active = next;
          state.loadedSince = new Date().toISOString();
          await persistActive(next);
        }
      },
      drainTimeoutMs
    );

  const checkTimeoutMs = numberEnv(
    'CHECK_TIMEOUT_MS',
    DEFAULT_CHECK_TIMEOUT_MS
  );
  const ytdlpBinary = process.env.YTDLP_BINARY ?? 'yt-dlp';
  const fetcher = new YtdlpFetcher({
    binary: ytdlpBinary,
    timeoutMs: checkTimeoutMs,
    download: CHECK_DOWNLOAD,
    trackProcess: children.track
  });
  const checkUrl = process.env.CHECK_URL ?? DEFAULT_CHECK_URL;
  const exitIpUrl = process.env.EXIT_IP_URL ?? DEFAULT_EXIT_IP_URL;
  const handshakeFreshMs = numberEnv(
    'HANDSHAKE_FRESH_MS',
    DEFAULT_HANDSHAKE_FRESH_MS
  );

  const list = async (url: string): Promise<YoutubeSource> => {
    try {
      return await fetcher.listSource(url);
    } catch (error) {
      if (children.interrupted && !isSourceError(error)) {
        throw new SwitchInterruptedError();
      }

      throw error;
    }
  };

  const checkDeps = {
    active: () => state.active,
    listSource: () => fetcher.listSource(checkUrl),
    readExitIp: () => readExitIp(exitIpUrl, checkTimeoutMs),
    readHandshake: () => readHandshake(interfaceName, handshakeFreshMs)
  };

  const check = (): Promise<EgressCheckFacts> => checkActive(checkDeps);

  const switchConfig = async (name?: string): Promise<EgressCheckFacts> => {
    if (name !== undefined && name !== state.active) {
      await localApplyConfig(name);
    }

    return checkActive(checkDeps);
  };

  /* Parse before listening: a broken pool or a misfiled active name is a boot
   * failure with a message, not a socket that answers 500 forever. */
  await status();

  if (process.argv.includes('--dry-run')) {
    /* The deployment command parses this stdout, so it is data, not a log. */
    console.log(JSON.stringify(await status(), null, 2));
    return;
  }

  /* The first boot pins the choice the unit already applied, so the next boot
   * reads a name instead of falling through to the first file. */
  if (state.active !== null) {
    await persistActive(state.active);
  }

  const fetchTrack = async (
    request: AgentFetchRequest & { tempDir: string }
  ): Promise<{ filePath: string }> => {
    try {
      const downloader = new YtdlpFetcher({
        binary: ytdlpBinary,
        timeoutMs: request.timeoutMs,
        download: request.download,
        trackProcess: children.track
      });
      const fetched = await downloader.fetchTrack({
        videoId: request.videoId,
        tempDir: request.tempDir,
        skipNonMusic: request.skipNonMusic
      });

      return { filePath: fetched.filePath };
    } catch (error) {
      if (children.interrupted && !isSourceError(error)) {
        throw new SwitchInterruptedError();
      }

      throw error;
    }
  };

  const handle = await startAgent({
    socketPath,
    peerUid,
    status,
    switch: switchConfig,
    check,
    apply: localApplyConfig,
    list,
    fetch: fetchTrack
  });

  logger.info({ socketPath }, 'agent_started');

  const stop = (): void => {
    void handle.close().then(() => process.exit(0));
  };

  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'agent_failed');
  process.exit(1);
});
