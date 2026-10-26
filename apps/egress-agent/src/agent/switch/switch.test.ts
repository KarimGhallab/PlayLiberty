import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChildRegistry } from '../processes/processes.js';
import { NoInterfaceError } from '../wireguard/wireguard.js';
import { requireInPool, switchExit, switchTo } from './switch.js';

let directory: string | undefined;

afterEach(async () => {
  if (directory !== undefined) {
    await rm(directory, { recursive: true, force: true });
    directory = undefined;
  }
});

function config(endpoint: string): string {
  return `[Interface]
PrivateKey = abc

[Peer]
PublicKey = def
AllowedIPs = 0.0.0.0/0
Endpoint = ${endpoint}
`;
}

async function pool(files: Record<string, string>): Promise<string> {
  directory = await mkdtemp(join(tmpdir(), 'playliberty-switch-'));
  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      writeFile(join(directory as string, name), content)
    )
  );

  return directory;
}

describe('switchExit', () => {
  it('drains, kills what is left, then applies the config', async () => {
    const order: string[] = [];
    const registry = new ChildRegistry();
    vi.spyOn(registry, 'drain').mockImplementation(async () => {
      order.push('drain');
    });
    vi.spyOn(registry, 'killAll').mockImplementation(() => {
      order.push('kill');
    });

    await switchExit(
      {
        registry,
        apply: async () => {
          order.push('apply');
        }
      },
      '02-ch',
      1000
    );

    expect(order).toEqual(['drain', 'kill', 'apply']);
    expect(registry.interrupted).toBe(false);
  });

  it('ends the interruption window even when the apply fails', async () => {
    const registry = new ChildRegistry();
    vi.spyOn(registry, 'drain').mockResolvedValue(undefined);
    vi.spyOn(registry, 'killAll').mockImplementation(() => undefined);

    await expect(
      switchExit(
        {
          registry,
          apply: async () => {
            throw new Error('the interface is down');
          }
        },
        '02-ch',
        1000
      )
    ).rejects.toThrow('the interface is down');

    expect(registry.interrupted).toBe(false);
  });
});

describe('switchTo', () => {
  it('applies a usable config, then moves the loaded name', async () => {
    const root = await pool({ '01-fr.conf': config('185.0.0.1:51820') });
    const registry = new ChildRegistry();
    const order: string[] = [];

    await switchTo(
      '01-fr',
      {
        poolDirectory: root,
        interfaceName: 'wg0',
        registry,
        apply: async () => {
          order.push('apply');
        },
        onSwitched: () => {
          order.push('switch');
        }
      },
      1000
    );

    expect(order).toEqual(['apply', 'switch']);
  });

  it('refuses a config with no endpoint before draining anything', async () => {
    const root = await pool({ '01-broken.conf': '[Peer]\nPublicKey = x\n' });
    const registry = new ChildRegistry();
    const drain = vi.spyOn(registry, 'drain');
    const apply = vi.fn(async () => undefined);

    await expect(
      switchTo(
        '01-broken',
        {
          poolDirectory: root,
          interfaceName: 'wg0',
          registry,
          apply,
          onSwitched: vi.fn()
        },
        1000
      )
    ).rejects.toThrow(/No config named/);

    expect(apply).not.toHaveBeenCalled();
    expect(drain).not.toHaveBeenCalled();
  });

  it('refuses a switch before draining when no interface exists', async () => {
    const root = await pool({ '01-fr.conf': config('185.0.0.1:51820') });
    const registry = new ChildRegistry();
    const drain = vi.spyOn(registry, 'drain');
    const apply = vi.fn(async () => undefined);

    await expect(
      switchTo(
        '01-fr',
        {
          poolDirectory: root,
          interfaceName: null,
          registry,
          apply,
          onSwitched: vi.fn()
        },
        1000
      )
    ).rejects.toBeInstanceOf(NoInterfaceError);

    expect(apply).not.toHaveBeenCalled();
    expect(drain).not.toHaveBeenCalled();
  });

  it('leaves the loaded name alone when the apply fails', async () => {
    const root = await pool({ '01-fr.conf': config('185.0.0.1:51820') });
    const registry = new ChildRegistry();
    const onSwitched = vi.fn();

    await expect(
      switchTo(
        '01-fr',
        {
          poolDirectory: root,
          interfaceName: 'wg0',
          registry,
          apply: async () => {
            throw new Error('the interface is down');
          },
          onSwitched
        },
        1000
      )
    ).rejects.toThrow('the interface is down');

    expect(onSwitched).not.toHaveBeenCalled();
    expect(registry.interrupted).toBe(false);
  });
});

describe('requireInPool', () => {
  it('refuses a config with no endpoint, before any interface work', async () => {
    await expect(
      requireInPool([{ name: '01-broken', endpoint: null }], '01-broken')
    ).rejects.toThrow(/No config named/);
  });
});
