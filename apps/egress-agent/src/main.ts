import type { DownloadOptions, EgressAgentStatus } from '@playliberty/youtube';
import { YtdlpFetcher } from '@playliberty/youtube';

import { readExitIp } from './agent/exitIp.js';
import { readHandshake } from './agent/handshake.js';
import { probeExit, requireInPool } from './agent/probe/probe.js';
import { startAgent } from './agent/server/server.js';
import { chooseActive } from './agent/status.js';
import { readPool } from './pool/pool.js';

const DEFAULT_SOCKET = '/run/playliberty/egress-agent.sock';
const DEFAULT_PEER_UID = 1000;
const DEFAULT_PROBE_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const DEFAULT_EXIT_IP_URL = 'https://api.ipify.org';
const DEFAULT_PROBE_TIMEOUT_MS = 60_000;
const DEFAULT_HANDSHAKE_FRESH_MS = 180_000;

/* `listSource` never reads the download options; the probe only lists. The
 * download path gets the server's options per request from ticket 05. */
const PROBE_DOWNLOAD: DownloadOptions = {
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

async function main(): Promise<void> {
  const poolDirectory = required(
    'PROTON_POOL_DIR',
    process.env.PROTON_POOL_DIR
  );
  const socketPath = process.env.EGRESS_AGENT_SOCKET ?? DEFAULT_SOCKET;
  const peerUid = Number.parseInt(
    process.env.EGRESS_AGENT_PEER_UID ?? String(DEFAULT_PEER_UID),
    10
  );

  if (!Number.isInteger(peerUid) || peerUid < 0) {
    throw new Error('EGRESS_AGENT_PEER_UID must be a non-negative integer.');
  }

  const loadedSince = new Date().toISOString();
  const state = {
    active: chooseActive(
      await readPool(poolDirectory),
      process.env.PROTON_ACTIVE_CONFIG
    )
  };

  const status = async (): Promise<EgressAgentStatus> => ({
    pool: await readPool(poolDirectory),
    active: state.active,
    loadedSince
  });

  const switchTo = async (name: string): Promise<void> => {
    await requireInPool(await readPool(poolDirectory), name);
    state.active = name;
  };

  const probeTimeoutMs = numberEnv(
    'PROBE_TIMEOUT_MS',
    DEFAULT_PROBE_TIMEOUT_MS
  );
  const fetcher = new YtdlpFetcher({
    binary: process.env.YTDLP_BINARY ?? 'yt-dlp',
    timeoutMs: probeTimeoutMs,
    download: PROBE_DOWNLOAD
  });
  const probeUrl = process.env.PROBE_URL ?? DEFAULT_PROBE_URL;
  const exitIpUrl = process.env.EXIT_IP_URL ?? DEFAULT_EXIT_IP_URL;
  const interfaceName = process.env.WG_INTERFACE ?? null;
  const handshakeFreshMs = numberEnv(
    'HANDSHAKE_FRESH_MS',
    DEFAULT_HANDSHAKE_FRESH_MS
  );

  const probe = (name?: string) =>
    probeExit(
      {
        active: () => state.active,
        switchTo,
        listSource: () => fetcher.listSource(probeUrl),
        readExitIp: () => readExitIp(exitIpUrl, probeTimeoutMs),
        readHandshake: () => readHandshake(interfaceName, handshakeFreshMs)
      },
      name
    );

  /* Parse before listening: a broken pool or a misfiled active name is a boot
   * failure with a message, not a socket that answers 500 forever. */
  await status();

  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify(await status(), null, 2));
    return;
  }

  const handle = await startAgent({
    socketPath,
    peerUid,
    status,
    probe
  });

  const log = (event: string): void => {
    console.log(
      JSON.stringify({ at: new Date().toISOString(), event, socketPath })
    );
  };

  log('agent_started');

  const stop = (): void => {
    void handle.close().then(() => process.exit(0));
  };

  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
