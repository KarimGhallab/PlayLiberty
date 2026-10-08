import { afterEach, describe, expect, it } from 'vitest';

import { createTestContext } from '../../testing/createTestContext.js';
import type { TestContext } from '../../testing/createTestContext.js';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

describe('health routes', () => {
  it('answers /healthz', async () => {
    context = await createTestContext();

    const response = await context.app.inject({
      method: 'GET',
      url: '/healthz'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('answers /readyz when the database and media root are reachable', async () => {
    context = await createTestContext();

    const response = await context.app.inject({
      method: 'GET',
      url: '/readyz'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
