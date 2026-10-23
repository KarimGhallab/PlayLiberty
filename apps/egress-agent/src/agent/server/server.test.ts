import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  EgressAgentClient,
  EgressConfigUnknownError,
  EgressSourceInvalidError,
  EgressSourceUnavailableError,
  YoutubeSourceKind
} from '@playliberty/youtube';
import type {
  EgressAgentStatus,
  EgressProbeFacts,
  YoutubeSource
} from '@playliberty/youtube';

import { UnknownConfigError } from '../probe/probe.js';
import { chooseActive } from '../status.js';
import { startAgent } from './server.js';

const status: EgressAgentStatus = {
  pool: [
    { name: '01-fr', endpoint: '185.0.0.1:51820' },
    { name: '02-ch', endpoint: '185.0.0.2:51820' }
  ],
  active: '01-fr',
  loadedSince: '2026-10-23T10:00:00.000Z'
};

const probe: EgressProbeFacts = {
  handshake: true,
  listing: true,
  exitIp: '185.0.0.9',
  reason: null,
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
    probe?: (name?: string) => Promise<EgressProbeFacts>;
    list?: (url: string) => Promise<YoutubeSource>;
  } = {}
): Promise<string> {
  directory = await mkdtemp(join(tmpdir(), 'playliberty-egress-agent-'));
  const socketPath = join(directory, 'egress-agent.sock');
  const handle = await startAgent({
    socketPath,
    peerUid: uid,
    status: async () => status,
    probe: overrides.probe ?? (async () => probe),
    list: overrides.list ?? (async () => source)
  });
  close = handle.close;
  return socketPath;
}

describe('the egress agent', () => {
  it('answers the pool over the socket', async () => {
    const socketPath = await agent();

    expect(await new EgressAgentClient(socketPath).status()).toEqual(status);
  });

  it('answers a probe over the socket', async () => {
    const socketPath = await agent();

    expect(await new EgressAgentClient(socketPath).probe('02-ch')).toEqual(
      probe
    );
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
      probe: async () => {
        throw new UnknownConfigError('03-missing');
      }
    });

    await expect(
      new EgressAgentClient(socketPath).probe('03-missing')
    ).rejects.toBeInstanceOf(EgressConfigUnknownError);
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
      probe: async () => probe,
      list: async () => source
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
