import { describe, expect, it, vi } from 'vitest';

import type { YoutubeSource } from '@playliberty/youtube';
import { YoutubeSourceKind } from '@playliberty/youtube';

import type { ProbeDeps } from './probe.js';
import { probeExit, requireInPool } from './probe.js';

const SOURCE: YoutubeSource = {
  kind: YoutubeSourceKind.Video,
  sourceId: 'jNQXAC9IVRw',
  title: 'Me at the zoo',
  entries: []
};

function deps(overrides: Partial<ProbeDeps> = {}): ProbeDeps {
  return {
    active: () => '01-fr',
    switchTo: vi.fn(async () => undefined),
    listSource: async () => SOURCE,
    readExitIp: async () => '185.0.0.9',
    readHandshake: async () => true,
    ...overrides
  };
}

describe('probeExit', () => {
  it('probes the loaded config without switching', async () => {
    const switchTo = vi.fn(async () => undefined);

    const facts = await probeExit(deps({ switchTo }));

    expect(switchTo).not.toHaveBeenCalled();
    expect(facts).toMatchObject({
      handshake: true,
      listing: true,
      exitIp: '185.0.0.9',
      reason: null,
      active: '01-fr'
    });
  });

  it('switches to a named config before probing it', async () => {
    let active = '01-fr';
    const switchTo = vi.fn(async (name: string) => {
      active = name;
    });

    const facts = await probeExit(
      deps({ active: () => active, switchTo }),
      '02-ch'
    );

    expect(switchTo).toHaveBeenCalledWith('02-ch');
    expect(facts.active).toBe('02-ch');
  });

  it('classifies a blocked listing', async () => {
    const facts = await probeExit(
      deps({
        listSource: async () => {
          throw new Error('ERROR: Sign in to confirm you are not a bot');
        }
      })
    );

    expect(facts).toMatchObject({
      listing: false,
      reason: 'blocked',
      exitIp: '185.0.0.9'
    });
  });

  it('classifies a gone probe video without blaming the exit', async () => {
    const facts = await probeExit(
      deps({
        listSource: async () => {
          throw new Error('ERROR: Video unavailable');
        }
      })
    );

    expect(facts.reason).toBe('unavailable');
  });

  it('reports a network failure when the exit address cannot be read', async () => {
    const facts = await probeExit(deps({ readExitIp: async () => null }));

    expect(facts).toMatchObject({
      listing: true,
      exitIp: null,
      reason: 'network'
    });
  });

  it('does not fail a working probe on a stale handshake', async () => {
    const facts = await probeExit(deps({ readHandshake: async () => false }));

    expect(facts).toMatchObject({ handshake: false, reason: null });
  });

  it('treats an unconfigured interface as unmeasured', async () => {
    const facts = await probeExit(deps({ readHandshake: async () => null }));

    expect(facts.handshake).toBeNull();
  });
});

describe('requireInPool', () => {
  it('refuses a config with no endpoint, before any interface work', async () => {
    await expect(
      requireInPool([{ name: '01-broken', endpoint: null }], '01-broken')
    ).rejects.toThrow(/No config named/);
  });
});
