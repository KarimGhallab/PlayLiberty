import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import type { TestContext } from './createTestContext.js';
import { createTestContext } from './createTestContext.js';
import { seedAccount } from './fixtures.js';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

describe('the e2e routes', () => {
  it('are absent without the harness flag', async () => {
    context = await createTestContext({ E2E_HARNESS: 'false' });
    const account = seedAccount(context.database, { displayName: 'Someone' });

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/v1/__e2e__/reset',
      headers: {
        'remote-user': account.pangolinUserId,
        'x-playliberty-client': 'test'
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it('are absent in a production runtime even with the harness flag', async () => {
    context = await createTestContext({
      NODE_ENV: 'production',
      EDGE_ASSERTION: 'the-edge-secret',
      E2E_HARNESS: 'true'
    });
    const account = seedAccount(context.database, { displayName: 'Someone' });

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/v1/__e2e__/reset',
      headers: {
        'remote-user': account.pangolinUserId,
        'x-playliberty-edge': 'the-edge-secret',
        'x-playliberty-client': 'test'
      }
    });

    expect(response.statusCode).toBe(404);
  });

  it('are excluded from the production build', () => {
    const config = JSON.parse(
      readFileSync(
        new URL('../../../tsconfig.build.json', import.meta.url),
        'utf8'
      )
    ) as { exclude?: string[] };

    expect(config.exclude).toContain('src/app/testing/**');
  });
});
