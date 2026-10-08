import { count } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { accounts } from '../../../platform/database/schema.js';
import type { TestContext } from '../../testing/createTestContext.js';
import { createTestContext } from '../../testing/createTestContext.js';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

describe('the identity hook', () => {
  it('rejects an unauthenticated API request', async () => {
    context = await createTestContext();

    const response = await context.app.inject({
      method: 'GET',
      url: '/api/v1/me'
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'unauthenticated' });
  });

  it('auto-provisions an account from the forwarded headers', async () => {
    context = await createTestContext();
    const headers = {
      'remote-user': 'pangolin-user-1',
      'remote-name': 'Ada',
      'remote-email': 'ada@example.com'
    };

    const first = await context.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ displayName: 'Ada', role: 'user' });

    const second = await context.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers
    });
    expect(second.json().id).toBe(first.json().id);

    const total = context.database.db
      .select({ value: count() })
      .from(accounts)
      .get();
    expect(total?.value).toBe(1);
  });

  it('grants the admin role from the configured list', async () => {
    context = await createTestContext({
      ADMIN_PANGOLIN_USER_IDS: 'pangolin-user-1'
    });

    const response = await context.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { 'remote-user': 'pangolin-user-1' }
    });

    expect(response.json().role).toBe('admin');
  });

  it('exempts the health endpoints from authentication', async () => {
    context = await createTestContext();

    const response = await context.app.inject({
      method: 'GET',
      url: '/healthz'
    });

    expect(response.statusCode).toBe(200);
  });

  it('refuses a forged identity header that carries no edge assertion', async () => {
    context = await createTestContext({ EDGE_ASSERTION: 'the-edge-secret' });

    const response = await context.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { 'remote-user': 'attacker-pangolin-user' }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'unauthenticated' });
  });

  it('refuses a wrong edge assertion', async () => {
    context = await createTestContext({ EDGE_ASSERTION: 'the-edge-secret' });

    const response = await context.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: {
        'remote-user': 'pangolin-user-1',
        'x-playliberty-edge': 'not-the-secret'
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it('accepts a request that carries the edge assertion', async () => {
    context = await createTestContext({ EDGE_ASSERTION: 'the-edge-secret' });

    const response = await context.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: {
        'remote-user': 'pangolin-user-1',
        'remote-name': 'Ada',
        'x-playliberty-edge': 'the-edge-secret'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ displayName: 'Ada' });
  });

  it('still exempts the health endpoints when an assertion is configured', async () => {
    context = await createTestContext({ EDGE_ASSERTION: 'the-edge-secret' });

    const response = await context.app.inject({
      method: 'GET',
      url: '/healthz'
    });

    expect(response.statusCode).toBe(200);
  });
});
