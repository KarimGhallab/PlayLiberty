import { describe, expect, it } from 'vitest';

import type {
  IPangolinClient,
  MintResourceAccessTokenInput
} from '../../../../shared/pangolin.js';

import { createTestContext } from '../../../../app/testing/createTestContext.js';

import { issueMobileSession } from './credentialService.js';

const NOW = Date.parse('2026-11-01T12:00:00.000Z');

class FakePangolin implements IPangolinClient {
  readonly calls: MintResourceAccessTokenInput[] = [];

  async mintResourceAccessToken(
    input: MintResourceAccessTokenInput
  ): Promise<{ id: string; secret: string }> {
    this.calls.push(input);

    return { id: 'token-id', secret: 'token-secret' };
  }
}

describe('issueMobileSession', () => {
  it('clamps both credentials to the family remaining life', async () => {
    const context = await createTestContext();
    const pangolin = new FakePangolin();

    try {
      const pair = await issueMobileSession({
        database: context.database,
        pangolin,
        lifetimes: {
          accessSeconds: 7200,
          refreshSeconds: 7200,
          familySeconds: 3600
        },
        pangolinUserId: 'p-alice',
        now: () => NOW
      });

      expect(pair.access.expires_in).toBe(3600);
      expect(pair.refresh.expires_in).toBe(3600);
      expect(pangolin.calls[0]?.validForSeconds).toBe(3600);
    } finally {
      await context.cleanup();
    }
  });
});
