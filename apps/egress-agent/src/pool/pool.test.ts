import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { endpointOf, readPool } from './pool.js';

let directory: string | undefined;

afterEach(async () => {
  if (directory !== undefined) {
    await rm(directory, { recursive: true, force: true });
    directory = undefined;
  }
});

async function pool(files: Record<string, string>): Promise<string> {
  directory = await mkdtemp(join(tmpdir(), 'playliberty-pool-'));
  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      writeFile(join(directory as string, name), content)
    )
  );
  return directory;
}

function config(endpoint: string): string {
  return `[Interface]
PrivateKey = abc
Address = 10.2.0.2/32
DNS = 10.2.0.1

[Peer]
PublicKey = def
AllowedIPs = 0.0.0.0/0
Endpoint = ${endpoint}
`;
}

describe('endpointOf', () => {
  it('reads the peer endpoint and nothing from the interface block', () => {
    expect(endpointOf(config('185.0.0.1:51820'))).toBe('185.0.0.1:51820');
  });

  it('answers null for a config with no endpoint', () => {
    expect(endpointOf('[Interface]\nPrivateKey = abc\n')).toBeNull();
  });
});

describe('readPool', () => {
  it('orders the pool by file name and ignores anything that is not a config', async () => {
    const root = await pool({
      '02-ch.conf': config('2.2.2.2:51820'),
      '01-fr.conf': config('1.1.1.1:51820'),
      'notes.txt': 'not a config',
      README: 'not a config'
    });

    const configs = await readPool(root);

    expect(configs.map(entry => entry.name)).toEqual(['01-fr', '02-ch']);
    expect(configs[0]?.endpoint).toBe('1.1.1.1:51820');
  });

  it('reports a config whose endpoint cannot be read instead of dropping it', async () => {
    const root = await pool({ '01-broken.conf': '[Peer]\nPublicKey = x\n' });

    expect(await readPool(root)).toEqual([
      { name: '01-broken', endpoint: null }
    ]);
  });
});
