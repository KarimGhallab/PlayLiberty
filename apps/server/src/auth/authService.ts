import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { UserRole } from '@playliberty/contracts';

import type { DatabaseHandle } from '../db/client.js';
import { accounts } from '../db/schema.js';
import type { AuthAccount, ForwardedIdentity } from './types.js';

export interface ResolveAccountOptions {
  database: DatabaseHandle;
  adminPangolinUserIds: string[];
}

// The edge has already authenticated the caller. The first request from a
// Pangolin user creates the account; later requests refresh the display fields
// and role. The role always comes from the configured admin list, never from
// the request, so a client cannot promote itself.
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
