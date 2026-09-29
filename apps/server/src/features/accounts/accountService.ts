import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import type { Account } from '@playliberty/contracts';
import { UserRole } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { accounts } from '../../platform/database/schema.js';
import type { AuthAccount, ForwardedIdentity } from './types.js';

export interface ResolveAccountOptions {
  database: DatabaseHandle;
  adminPangolinUserIds: string[];
}

/*
 * Turning a forwarded identity into the account row the rest of the app uses.
 * This is the accounts feature's work, not the request pipeline's, and it is why
 * this file exists in features/accounts: the hook reads three headers and calls
 * this, and nothing about the account table leaks up into the pipeline.
 *
 * The edge has already authenticated the caller. The first request from a Pangolin
 * user creates the account; later requests refresh the display fields and the role.
 * The role always comes from the configured admin list, never from the request, so
 * a client cannot promote itself.
 */
export function resolveAccount(
  options: ResolveAccountOptions,
  identity: ForwardedIdentity
): AuthAccount {
  const role = options.adminPangolinUserIds.includes(identity.pangolinUserId)
    ? UserRole.Admin
    : UserRole.User;
  const displayName =
    identity.name ?? identity.email ?? identity.pangolinUserId;
  const now = new Date().toISOString();

  const existing = options.database.db
    .select()
    .from(accounts)
    .where(eq(accounts.pangolinUserId, identity.pangolinUserId))
    .get();

  if (existing !== undefined) {
    options.database.db
      .update(accounts)
      .set({ displayName, email: identity.email, role, updatedAt: now })
      .where(eq(accounts.id, existing.id))
      .run();

    return {
      id: existing.id,
      pangolinUserId: identity.pangolinUserId,
      displayName,
      email: identity.email,
      avatarUrl: existing.avatarUrl,
      role
    };
  }

  const id = randomUUID();
  options.database.db
    .insert(accounts)
    .values({
      id,
      pangolinUserId: identity.pangolinUserId,
      displayName,
      email: identity.email,
      avatarUrl: null,
      role,
      createdAt: now,
      updatedAt: now
    })
    .run();

  return {
    id,
    pangolinUserId: identity.pangolinUserId,
    displayName,
    email: identity.email,
    avatarUrl: null,
    role
  };
}

/*
 * The caller's own account, as the wider contract's `Account` describes it. This
 * is the one route that may return an email address and a role, because it is
 * returning them to their owner. The directory that lists other accounts is a
 * different question with a narrower answer, and it is not this function.
 */
export function toAccountView(account: AuthAccount): Account {
  return {
    id: account.id,
    displayName: account.displayName,
    email: account.email,
    avatarUrl: account.avatarUrl,
    role: account.role
  };
}
