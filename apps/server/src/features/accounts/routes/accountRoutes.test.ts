import { afterEach, describe, expect, it } from 'vitest';

import { AccountSummarySchema, createPageSchema } from '@playliberty/contracts';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';

const DirectoryPageSchema = createPageSchema(AccountSummarySchema);

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

/*
 * Accounts are provisioned through the identity hook, as the app does, so the
 * directory lists rows the app really made. The name is always sent.
 */
function provision(
  pangolinUserId: string,
  displayName: string,
  email?: string
): Promise<unknown> {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  const headers: Record<string, string> = {
    'remote-user': pangolinUserId,
    'remote-name': displayName
  };

  if (email !== undefined) {
    headers['remote-email'] = email;
  }

  return context.app.inject({ method: 'GET', url: '/api/v1/me', headers });
}

function listAccounts(pangolinUserId: string, displayName: string, query = '') {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'GET',
    url: `/api/v1/accounts${query}`,
    headers: { 'remote-user': pangolinUserId, 'remote-name': displayName }
  });
}

describe('GET /accounts', () => {
  it('lists every account with an id, a display name and an avatar, the caller included', async () => {
    context = await createTestContext();
    await provision('p-alice', 'Alice');
    await provision('p-bob', 'Bob');

    const response = await listAccounts('p-alice', 'Alice');

    expect(response.statusCode).toBe(200);
    const page = DirectoryPageSchema.parse(response.json());
    expect(page.total).toBe(2);
    expect(page.items.map(item => item.displayName)).toEqual(['Alice', 'Bob']);
    expect(page.items.every(item => item.avatarUrl === null)).toBe(true);
  });

  it('carries no email address and no role anywhere', async () => {
    context = await createTestContext();
    await provision('p-alice', 'Alice', 'alice@example.com');
    await provision('p-bob', 'Bob', 'bob@example.com');

    const response = await listAccounts('p-alice', 'Alice');

    DirectoryPageSchema.parse(response.json());

    const body = JSON.stringify(response.json());
    expect(body).not.toContain('@example.com');
    expect(body).not.toContain('"email"');
    expect(body).not.toContain('"role"');
  });

  it('orders by display name and pages with the existing query', async () => {
    context = await createTestContext();
    await provision('p-charlie', 'Charlie');
    await provision('p-alice', 'Alice');
    await provision('p-bob', 'Bob');

    const first = DirectoryPageSchema.parse(
      (await listAccounts('p-alice', 'Alice', '?limit=2&offset=0')).json()
    );
    const second = DirectoryPageSchema.parse(
      (await listAccounts('p-alice', 'Alice', '?limit=2&offset=2')).json()
    );

    expect(first.total).toBe(3);
    expect(first.items.map(item => item.displayName)).toEqual(['Alice', 'Bob']);
    expect(second.total).toBe(3);
    expect(second.items.map(item => item.displayName)).toEqual(['Charlie']);
  });

  it('refuses an unauthenticated request', async () => {
    context = await createTestContext();

    const response = await context.app.inject({
      method: 'GET',
      url: '/api/v1/accounts'
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'unauthenticated' });
  });
});
