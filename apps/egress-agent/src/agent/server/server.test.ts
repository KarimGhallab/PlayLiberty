import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  AgentFetchRequest,
  DownloadOptions,
  EgressAgentStatus,
  EgressCheckFacts,
  YoutubeSource
} from '@playliberty/youtube';
import {
  EgressAgentClient,
  EgressConfigUnknownError,
  EgressSourceInvalidError,
  EgressSourceUnavailableError,
  EgressStreamError,
  EgressSwitchError,
  YoutubeSourceKind,
  YoutubeSponsorBlockError,
  YoutubeVideoUnavailableError
} from '@playliberty/youtube';

import { chooseActive, resolveActive } from '../status.js';
import { UnknownConfigError } from '../switch/switch.js';
import { SwitchInterruptedError } from '../switch/switch.js';
import { NoInterfaceError } from '../wireguard/wireguard.js';
import { type AgentLog, startAgent } from './server.js';

const status: EgressAgentStatus = {
  pool: [
    { name: '01-fr', endpoint: '185.0.0.1:51820' },
    { name: '02-ch', endpoint: '185.0.0.2:51820' }
  ],
  active: '01-fr',
  loadedSince: '2026-10-23T10:00:00.000Z'
};

const check: EgressCheckFacts = {
  handshake: true,
  listing: true,
  exitIp: '185.0.0.9',
  failure: null,
  active: '01-fr'
};

const source: YoutubeSource = {
  kind: YoutubeSourceKind.Video,
  sourceId: 'jNQXAC9IVRw',
  title: 'Me at the zoo',
  entries: [
    {
      videoId: 'jNQXAC9IVRw',
      title: 'Me at the zoo',
      durationSeconds: 19,
      thumbnailUrl: null
    }
  ]
};

const URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

const DOWNLOAD: DownloadOptions = {
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

const silentLog: AgentLog = {
  info: () => undefined,
  warn: () => undefined
};

type FetchFn = (
  request: AgentFetchRequest & { tempDir: string }
) => Promise<{ filePath: string }>;

async function writeFakeTrack(
  request: AgentFetchRequest & { tempDir: string }
): Promise<{ filePath: string }> {
  const filePath = join(request.tempDir, `${request.videoId}.webm`);
  await writeFile(filePath, 'fake-audio');

  return { filePath };
}

let directory: string | undefined;
let close: (() => Promise<void>) | undefined;

afterEach(async () => {
  if (close !== undefined) {
    await close();
    close = undefined;
  }

  if (directory !== undefined) {
    await rm(directory, { recursive: true, force: true });
    directory = undefined;
  }
});

async function agent(
  uid: number = process.getuid?.() ?? 1000,
  overrides: {
    switch?: (name?: string) => Promise<EgressCheckFacts>;
    check?: () => Promise<EgressCheckFacts>;
    apply?: (name: string, drainTimeoutMs: number) => Promise<void>;
    list?: (url: string) => Promise<YoutubeSource>;
    fetch?: FetchFn;
    log?: AgentLog;
  } = {}
): Promise<string> {
  directory = await mkdtemp(join(tmpdir(), 'playliberty-egress-agent-'));
  const socketPath = join(directory, 'egress-agent.sock');
  let current = status;
  const handle = await startAgent({
    socketPath,
    peerUid: uid,
    status: async () => current,
    switch: overrides.switch ?? (async () => check),
    check: overrides.check ?? (async () => check),
    apply:
      overrides.apply ??
      (async (name: string): Promise<void> => {
        current = { ...current, active: name };
      }),
    list: overrides.list ?? (async () => source),
    fetch: overrides.fetch ?? writeFakeTrack,
    log: overrides.log ?? silentLog
  });
  close = handle.close;
  return socketPath;
}

describe('the egress agent', () => {
  it('answers the pool over the socket', async () => {
    const socketPath = await agent();

    expect(await new EgressAgentClient(socketPath).status()).toEqual(status);
  });

  it('logs every request and its response', async () => {
    const log = { info: vi.fn(), warn: vi.fn() };
    const socketPath = await agent(process.getuid?.() ?? 1000, { log });

    await new EgressAgentClient(socketPath).status();

    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'agent_request',
        method: 'GET',
        path: '/status'
      }),
      'agent request'
    );

    await vi.waitFor(() => {
      expect(log.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'agent_response',
          method: 'GET',
          path: '/status',
          status: 200
        }),
        'agent response'
      );
    });

    expect(log.warn).not.toHaveBeenCalled();
  });

  it('answers a switch over the socket', async () => {
    const socketPath = await agent();

    expect(await new EgressAgentClient(socketPath).switch('02-ch')).toEqual(
      check
    );
  });

  it('answers a check over the socket', async () => {
    const socketPath = await agent();

    expect(await new EgressAgentClient(socketPath).check()).toEqual(check);
  });

  it('answers a listing over the socket', async () => {
    const socketPath = await agent();

    expect(await new EgressAgentClient(socketPath).list(URL)).toEqual(source);
  });

  it('refuses a URL that is not a YouTube source', async () => {
    const socketPath = await agent();

    await expect(
      new EgressAgentClient(socketPath).list('https://example.com/playlist')
    ).rejects.toBeInstanceOf(EgressSourceInvalidError);
  });

  it('classifies a listing failure instead of calling it an outage', async () => {
    const socketPath = await agent(process.getuid?.() ?? 1000, {
      list: async () => {
        throw new Error('ERROR: Sign in to confirm you are not a bot');
      }
    });

    await expect(
      new EgressAgentClient(socketPath).list(URL)
    ).rejects.toMatchObject({ reason: 'blocked' });

    await expect(
      new EgressAgentClient(socketPath).list(URL)
    ).rejects.toBeInstanceOf(EgressSourceUnavailableError);
  });

  it('turns an unknown config into the client error, not an outage', async () => {
    const socketPath = await agent(process.getuid?.() ?? 1000, {
      switch: async () => {
        throw new UnknownConfigError('03-missing');
      }
    });

    await expect(
      new EgressAgentClient(socketPath).switch('03-missing')
    ).rejects.toBeInstanceOf(EgressConfigUnknownError);
  });

  it('streams a fetched track with its source extension', async () => {
    const socketPath = await agent();
    const target = join(dirname(socketPath), 'download');

    const result = await new EgressAgentClient(socketPath).fetchTrack({
      videoId: 'jNQXAC9IVRw',
      tempDir: target,
      skipNonMusic: false,
      download: DOWNLOAD,
      timeoutMs: 5000
    });

    expect(result.filePath.endsWith('.webm')).toBe(true);
    expect(await readFile(result.filePath, 'utf8')).toBe('fake-audio');
  });

  it('refuses a fetch whose video id is not a video id', async () => {
    const fetch = vi.fn(writeFakeTrack);
    const socketPath = await agent(process.getuid?.() ?? 1000, { fetch });

    for (const videoId of ['../escape', 'a/b', 'abc#def', 'short']) {
      await expect(
        new EgressAgentClient(socketPath).fetchTrack({
          videoId,
          tempDir: join(dirname(socketPath), 'download'),
          skipNonMusic: false,
          download: DOWNLOAD,
          timeoutMs: 5000
        })
      ).rejects.toMatchObject({ status: 400 });
    }

    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses a listing entry whose id is not a video id', async () => {
    const socketPath = await agent(process.getuid?.() ?? 1000, {
      list: async () => ({
        ...source,
        entries: [
          {
            videoId: '../escape',
            title: 'bad entry',
            durationSeconds: null,
            thumbnailUrl: null
          }
        ]
      })
    });

    await expect(new EgressAgentClient(socketPath).list(URL)).rejects.toThrow(
      /unexpected source entry/
    );
  });

  it('turns a gone video into the terminal error the worker knows', async () => {
    const socketPath = await agent(process.getuid?.() ?? 1000, {
      fetch: async () => {
        throw new YoutubeVideoUnavailableError('jNQXAC9IVRw');
      }
    });

    await expect(
      new EgressAgentClient(socketPath).fetchTrack({
        videoId: 'jNQXAC9IVRw',
        tempDir: join(dirname(socketPath), 'download'),
        skipNonMusic: false,
        download: DOWNLOAD,
        timeoutMs: 5000
      })
    ).rejects.toBeInstanceOf(YoutubeVideoUnavailableError);
  });

  it('keeps a SponsorBlock outage transient', async () => {
    const socketPath = await agent(process.getuid?.() ?? 1000, {
      fetch: async () => {
        throw new YoutubeSponsorBlockError('jNQXAC9IVRw');
      }
    });

    await expect(
      new EgressAgentClient(socketPath).fetchTrack({
        videoId: 'jNQXAC9IVRw',
        tempDir: join(dirname(socketPath), 'download'),
        skipNonMusic: true,
        download: DOWNLOAD,
        timeoutMs: 5000
      })
    ).rejects.toBeInstanceOf(YoutubeSponsorBlockError);
  });

  it('classifies a refused fetch as a source failure', async () => {
    const socketPath = await agent(process.getuid?.() ?? 1000, {
      fetch: async () => {
        throw new Error('ERROR: Sign in to confirm you are not a bot');
      }
    });

    await expect(
      new EgressAgentClient(socketPath).fetchTrack({
        videoId: 'jNQXAC9IVRw',
        tempDir: join(dirname(socketPath), 'download'),
        skipNonMusic: false,
        download: DOWNLOAD,
        timeoutMs: 5000
      })
    ).rejects.toMatchObject({ reason: 'blocked' });
  });

  it('applies the config and answers the pool', async () => {
    const socketPath = await agent();

    const result = await new EgressAgentClient(socketPath).applyConfig(
      '02-ch',
      5000
    );

    expect(result.active).toBe('02-ch');
  });

  it('refuses an apply to a config that is not in the pool', async () => {
    const socketPath = await agent(process.getuid?.() ?? 1000, {
      apply: async () => {
        throw new UnknownConfigError('03-missing');
      }
    });

    await expect(
      new EgressAgentClient(socketPath).applyConfig('03-missing', 5000)
    ).rejects.toBeInstanceOf(EgressConfigUnknownError);
  });

  it('reports a refused apply with its fixed sentence', async () => {
    const socketPath = await agent(process.getuid?.() ?? 1000, {
      apply: async () => {
        throw new NoInterfaceError();
      }
    });

    await expect(
      new EgressAgentClient(socketPath).applyConfig('02-ch', 5000)
    ).rejects.toMatchObject({
      message: 'No WireGuard interface is configured.'
    });
  });

  it('tells a killed download apart from a source failure', async () => {
    const socketPath = await agent(process.getuid?.() ?? 1000, {
      fetch: async () => {
        throw new SwitchInterruptedError();
      }
    });

    await expect(
      new EgressAgentClient(socketPath).fetchTrack({
        videoId: 'jNQXAC9IVRw',
        tempDir: join(dirname(socketPath), 'download'),
        skipNonMusic: false,
        download: DOWNLOAD,
        timeoutMs: 5000
      })
    ).rejects.toBeInstanceOf(EgressStreamError);
  });

  it('tells a killed listing apart from a source failure', async () => {
    const socketPath = await agent(process.getuid?.() ?? 1000, {
      list: async () => {
        throw new SwitchInterruptedError();
      }
    });

    await expect(
      new EgressAgentClient(socketPath).list(URL)
    ).rejects.toBeInstanceOf(EgressSwitchError);
  });

  it('gives the socket to the peer and to nobody else', async () => {
    const socketPath = await agent();
    const socket = await stat(socketPath);

    expect(socket.mode & 0o777).toBe(0o600);
    expect(socket.uid).toBe(process.getuid?.());
  });

  it('replaces a socket left behind by an earlier process', async () => {
    directory = await mkdtemp(join(tmpdir(), 'playliberty-egress-agent-'));
    const socketPath = join(directory, 'egress-agent.sock');
    await writeFile(socketPath, 'stale');

    const handle = await startAgent({
      socketPath,
      peerUid: process.getuid?.() ?? 1000,
      status: async () => status,
      switch: async () => check,
      check: async () => check,
      apply: async () => undefined,
      list: async () => source,
      fetch: writeFakeTrack,
      log: silentLog
    });
    close = handle.close;

    expect(await new EgressAgentClient(socketPath).status()).toEqual(status);
  });
});

describe('chooseActive', () => {
  it('names the config the unit loaded, when it is in the pool', () => {
    expect(chooseActive(status.pool, '02-ch')).toBe('02-ch');
  });

  it('assumes the first file when the unit names none', () => {
    expect(chooseActive(status.pool, undefined)).toBe('01-fr');
  });

  it('refuses a name that is not in the pool', () => {
    expect(() => chooseActive(status.pool, '03-missing')).toThrow(
      /not in the pool/
    );
  });
});

describe('resolveActive', () => {
  it('prefers the remembered name over the explicit name', () => {
    expect(resolveActive(status.pool, '02-ch', '01-fr')).toBe('02-ch');
  });

  it('falls back to the explicit name, then the first file', () => {
    expect(resolveActive(status.pool, null, '02-ch')).toBe('02-ch');
    expect(resolveActive(status.pool, null, undefined)).toBe('01-fr');
  });

  it('refuses a remembered name that is no longer in the pool', () => {
    expect(() => resolveActive(status.pool, '03-missing', undefined)).toThrow(
      /active state file/
    );
  });
});
