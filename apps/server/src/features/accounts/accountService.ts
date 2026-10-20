import { randomUUID } from 'node:crypto';

import { asc, eq, sql } from 'drizzle-orm';

import type { Account, AccountSummary, Page } from '@playliberty/contracts';
import { UserRole } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { accounts } from '../../platform/database/schema.js';
import type { AuthAccount, ForwardedIdentity } from './types.js';

export interface ResolveAccountOptions {
  database: DatabaseHandle;
  adminPangolinUserIds: string[];
}

/* The resolved account and whether its role changed; the caller owns the log
 * line. */
export interface ResolvedAccount {
  account: AuthAccount;
  roleChanged: boolean;
}

/* Turns a forwarded identity into the account row, creating it on first sight,
 * refreshing later. The role only ever comes from the configured admin list. */
export function resolveAccount(
  options: ResolveAccountOptions,
  identity: ForwardedIdentity
): ResolvedAccount {
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
    /* The caller logs a role change as an access-control event. */
    const roleChanged = existing.role !== role;

    options.database.db
      .update(accounts)
      .set({ displayName, email: identity.email, role, updatedAt: now })
      .where(eq(accounts.id, existing.id))
      .run();

    return {
      roleChanged,
      account: {
        id: existing.id,
        pangolinUserId: identity.pangolinUserId,
        displayName,
        email: identity.email,
        avatarUrl: existing.avatarUrl,
        role
      }
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
    roleChanged: false,
    account: {
      id,
      pangolinUserId: identity.pangolinUserId,
      displayName,
      email: identity.email,
      avatarUrl: null,
      role
    }
  };
}

/* The caller's own account: the one view with an email and a role, because
 * it returns them to their owner. */
export function toAccountView(account: AuthAccount): Account {
  return {
    id: account.id,
    displayName: account.displayName,
    email: account.email,
    avatarUrl: account.avatarUrl,
    role: account.role
  };
}

/* The narrow counterpart for a view that names another account: who it is, not
 * how to reach it or what it may do. Its input is the minimal shared shape. */
export interface AccountSummarySource {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export function toAccountSummary(
  account: AccountSummarySource
): AccountSummary {
  return {
    id: account.id,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl
  };
}

export interface ListAccountsQuery {
  limit: number;
  offset: number;
}

/* Ordered by display name, with a rowid tiebreak so equal names never swap
 * pages. Only the summary's three columns are read, so email cannot leak. */
export function listAccountSummaries(
  database: DatabaseHandle,
  query: ListAccountsQuery
): Page<AccountSummary> {
  const rows = database.db
    .select({
      id: accounts.id,
      displayName: accounts.displayName,
      avatarUrl: accounts.avatarUrl
    })
    .from(accounts)
    .orderBy(asc(accounts.displayName), asc(sql`${accounts}.rowid`))
    .limit(query.limit)
    .offset(query.offset)
    .all();

  const counted = database.db
    .select({ total: sql<number>`count(*)` })
    .from(accounts)
    .all();

  return {
    items: rows,
    total: counted[0]?.total ?? 0,
    limit: query.limit,
    offset: query.offset
  };
}
