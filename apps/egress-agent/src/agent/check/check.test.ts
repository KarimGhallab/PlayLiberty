import { describe, expect, it } from 'vitest';

import type { YoutubeSource } from '@playliberty/youtube';
import { YoutubeSourceKind } from '@playliberty/youtube';

import type { CheckDeps } from './check.js';
import { checkActive } from './check.js';

const SOURCE: YoutubeSource = {
  kind: YoutubeSourceKind.Video,
  sourceId: 'jNQXAC9IVRw',
  title: 'Me at the zoo',
  entries: []
};

function deps(overrides: Partial<CheckDeps> = {}): CheckDeps {
  return {
    active: () => '01-fr',
    listSource: async () => SOURCE,
    readExitIp: async () => '185.0.0.9',
    readHandshake: async () => true,
    ...overrides
  };
}

describe('checkActive', () => {
  it('reports the three facts of the loaded config', async () => {
    const facts = await checkActive(deps());

    expect(facts).toMatchObject({
      handshake: true,
      listing: true,
      exitIp: '185.0.0.9',
      reason: null,
      active: '01-fr'
    });
  });

  it('classifies a blocked listing', async () => {
    const facts = await checkActive(
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

  it('classifies a gone check video without blaming the exit', async () => {
    const facts = await checkActive(
      deps({
        listSource: async () => {
          throw new Error('ERROR: Video unavailable');
        }
      })
    );

    expect(facts.reason).toBe('unavailable');
  });

  it('reports a network failure when the exit address cannot be read', async () => {
    const facts = await checkActive(deps({ readExitIp: async () => null }));

    expect(facts).toMatchObject({
      listing: true,
      exitIp: null,
      reason: 'network'
    });
  });

  it('does not fail a working check on a stale handshake', async () => {
    const facts = await checkActive(deps({ readHandshake: async () => false }));

    expect(facts).toMatchObject({ handshake: false, reason: null });
  });

  it('treats an unconfigured interface as unmeasured', async () => {
    const facts = await checkActive(deps({ readHandshake: async () => null }));

    expect(facts.handshake).toBeNull();
  });
});
