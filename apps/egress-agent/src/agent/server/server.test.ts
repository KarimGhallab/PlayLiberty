import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  EgressAgentClient,
  EgressConfigUnknownError
} from '@playliberty/youtube';
import type { EgressAgentStatus, EgressProbeFacts } from '@playliberty/youtube';

import { UnknownConfigError } from './probe.js';
import { startAgent } from './server.js';
import { chooseActive } from './status.js';

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
  probeFn: (name?: string) => Promise<EgressProbeFacts> = async () => probe
): Promise<string> {
  directory = await mkdtemp(join(tmpdir(), 'playliberty-egress-agent-'));
  const socketPath = join(directory, 'egress-agent.sock');
  const handle = await startAgent({
    socketPath,
    peerUid: uid,
    status: async () => status,
    probe: probeFn
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

  it('turns an unknown config into the client error, not an outage', async () => {
    const socketPath = await agent(process.getuid?.() ?? 1000, async () => {
      throw new UnknownConfigError('03-missing');
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
      probe: async () => probe
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
