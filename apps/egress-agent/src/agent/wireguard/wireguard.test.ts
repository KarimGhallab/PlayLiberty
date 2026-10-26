import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RunCommand } from './wireguard.js';
import { NoInterfaceError, WireGuardError, applyConfig } from './wireguard.js';

const CONFIG = `[Interface]
PrivateKey = abc
Address = 10.2.0.2/32
DNS = 10.2.0.1

[Peer]
PublicKey = def
AllowedIPs = 0.0.0.0/0
Endpoint = 185.0.0.1:51820
`;

const STRIPPED = `[Interface]
PrivateKey = abc

[Peer]
PublicKey = def
AllowedIPs = 0.0.0.0/0
Endpoint = 185.0.0.1:51820
`;

let directory: string | undefined;

afterEach(async () => {
  if (directory !== undefined) {
    await rm(directory, { recursive: true, force: true });
    directory = undefined;
  }
});

async function pool(): Promise<string> {
  directory = await mkdtemp(join(tmpdir(), 'playliberty-wg-test-'));
  await writeFile(join(directory, '01-fr.conf'), CONFIG);

  return directory;
}

describe('applyConfig', () => {
  it('strips the wg-quick keys and syncs the interface from a private file', async () => {
    const root = await pool();
    const calls: string[][] = [];
    let written = '';
    let tempPath = '';

    const run: RunCommand = async (command, args) => {
      calls.push([command, ...args]);

      if (command === 'wg-quick') {
        return { stdout: STRIPPED };
      }

      if (command === 'ip') {
        return { stdout: '' };
      }

      tempPath = args[2] as string;
      written = await readFile(tempPath, 'utf8');

      return { stdout: '' };
    };

    await applyConfig(
      {
        interfaceName: 'playliberty-egress',
        poolDirectory: root,
        vethName: 'pl-egress1',
        vethHostIp: '10.200.0.1',
        run
      },
      '01-fr'
    );

    expect(calls).toEqual([
      ['wg-quick', 'strip', join(root, '01-fr.conf')],
      [
        'ip',
        'route',
        'replace',
        '185.0.0.1/32',
        'via',
        '10.200.0.1',
        'dev',
        'pl-egress1'
      ],
      ['wg', 'syncconf', 'playliberty-egress', tempPath]
    ]);
    expect(written).toBe(STRIPPED);
    await expect(readFile(tempPath, 'utf8')).rejects.toThrow();
  });

  it('removes the previous endpoint route after the new one is in place', async () => {
    const root = await pool();
    const calls: string[][] = [];
    const run: RunCommand = async (command, args) => {
      calls.push([command, ...args]);

      return { stdout: command === 'wg-quick' ? STRIPPED : '' };
    };

    await applyConfig(
      {
        interfaceName: 'wg0',
        poolDirectory: root,
        vethName: 'pl-egress1',
        vethHostIp: '10.200.0.1',
        previousEndpoint: '149.102.245.129:51820',
        run
      },
      '01-fr'
    );

    expect(calls).toContainEqual([
      'ip',
      'route',
      'del',
      '149.102.245.129/32',
      'dev',
      'pl-egress1'
    ]);
  });

  it('refuses a switch before touching the commands when no interface exists', async () => {
    const root = await pool();
    const run = vi.fn<RunCommand>();

    await expect(
      applyConfig(
        {
          interfaceName: null,
          poolDirectory: root,
          vethName: 'pl-egress1',
          vethHostIp: '10.200.0.1',
          run
        },
        '01-fr'
      )
    ).rejects.toBeInstanceOf(NoInterfaceError);

    expect(run).not.toHaveBeenCalled();
  });

  it('reports a failed strip with a fixed sentence', async () => {
    const root = await pool();
    const run: RunCommand = async () => {
      throw new Error('wg-quick: command not found');
    };

    await expect(
      applyConfig(
        {
          interfaceName: 'wg0',
          poolDirectory: root,
          vethName: 'pl-egress1',
          vethHostIp: '10.200.0.1',
          run
        },
        '01-fr'
      )
    ).rejects.toBeInstanceOf(WireGuardError);
  });

  it('reports a failed sync with a fixed sentence and removes the temp file', async () => {
    const root = await pool();
    let tempPath = '';
    const run: RunCommand = async (command, args) => {
      if (command === 'wg-quick') {
        return { stdout: STRIPPED };
      }

      if (command === 'ip') {
        return { stdout: '' };
      }

      tempPath = args[2] as string;
      throw new Error('wg: Unable to modify interface');
    };

    await expect(
      applyConfig(
        {
          interfaceName: 'wg0',
          poolDirectory: root,
          vethName: 'pl-egress1',
          vethHostIp: '10.200.0.1',
          run
        },
        '01-fr'
      )
    ).rejects.toMatchObject({
      message: 'The WireGuard interface could not be updated.'
    });
    await expect(readFile(tempPath, 'utf8')).rejects.toThrow();
  });
});
