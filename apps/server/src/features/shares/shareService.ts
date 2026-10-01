import { and, asc, eq, sql } from 'drizzle-orm';

import type { Share, ShareLevel } from '@playliberty/contracts';

import { isPlaylistOwner } from '../../shared/access/playlistAccess.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import type { AccountRow, ShareRow } from '../../platform/database/schema.js';
import { accounts, shares } from '../../platform/database/schema.js';
import { toAccountView } from '../accounts/accountService.js';

/*
 * Sharing a playlist. A share is a grant of access, so every route here is
 * owner-only: an account that could grant access would be an owner by definition,
 * and a write collaborator allowed to share would be a second owner wearing a
 * collaborator's label. The level is the share-level enum's own two members and
 * nothing else, and what each one means is enforced by the access rules the rest
 * of the app already asks (a read share reads and plays, a write share also adds,
 * removes, retries and syncs).
 */

function toShareView(share: ShareRow, account: AccountRow): Share {
  return {
    accountId: share.accountId,
    account: toAccountView(account),
    level: share.level,
    createdAt: share.createdAt
  };
}

/*
 * The owner's view of who holds a playlist. A playlist the caller does not own,
 * and one that does not exist, are the same null, so the route confirms neither.
 * Ordered by display name with the rowid tiebreak for the same reason the account
 * directory carries one: two accounts can share a name.
 */
export function listSharesForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): Share[] | null {
  if (!isPlaylistOwner(database, playlistId, accountId)) {
    return null;
  }

  const rows = database.db
    .select({ share: shares, account: accounts })
    .from(shares)
    .innerJoin(accounts, eq(shares.accountId, accounts.id))
    .where(eq(shares.playlistId, playlistId))
    .orderBy(asc(accounts.displayName), asc(sql`${accounts}.rowid`))
    .all();

  return rows.map(row => toShareView(row.share, row.account));
}

export enum GrantShareOutcome {
  Ok = 'ok',
  PlaylistNotFound = 'playlist_not_found',
  TargetNotFound = 'target_not_found',
  SelfShare = 'self_share'
}

export type GrantShareResult =
  | { outcome: GrantShareOutcome.Ok; share: Share }
  | { outcome: GrantShareOutcome.PlaylistNotFound }
  | { outcome: GrantShareOutcome.TargetNotFound }
  | { outcome: GrantShareOutcome.SelfShare };

export enum ShareRevokeOutcome {
  Ok = 'ok',
  PlaylistNotFound = 'playlist_not_found'
}

/*
 * Granting or changing a share. It is an upsert, so a second grant changes the
 * level on the one share the unique index on playlist and account already defines
 * rather than adding a second row; the created time is the first grant's and is
 * left alone. A share to the owner is refused because it would be a second path to
 * access the owner already has, and a share to an account that does not exist is
 * refused so a mistyped choice is not lost silently. A playlist the caller does
 * not own, and one that does not exist, are the same not-found.
 */
export function grantShareForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string,
  targetAccountId: string,
  level: ShareLevel
): GrantShareResult {
  if (!isPlaylistOwner(database, playlistId, accountId)) {
    return { outcome: GrantShareOutcome.PlaylistNotFound };
  }

  if (targetAccountId === accountId) {
    return { outcome: GrantShareOutcome.SelfShare };
  }

  const target = database.db
    .select()
    .from(accounts)
    .where(eq(accounts.id, targetAccountId))
    .get();

  if (target === undefined) {
    return { outcome: GrantShareOutcome.TargetNotFound };
  }

  const share = database.db
    .insert(shares)
    .values({ playlistId, accountId: targetAccountId, level })
    .onConflictDoUpdate({
      target: [shares.playlistId, shares.accountId],
      set: { level }
    })
    .returning()
    .get();

  if (share === undefined) {
    throw new Error('The granted share could not be read back.');
  }

  return { outcome: GrantShareOutcome.Ok, share: toShareView(share, target) };
}

/*
 * Taking a share back. It is owner-only like every other route here, so a
 * collaborator and a stranger get the same not-found. The delete is idempotent: a
 * share that is not there, including one aimed at an account that does not exist,
 * leaves the playlist unchanged and still succeeds, because the end state it asks
 * for already holds, which is what the user chose over a 404. No check that the
 * target account exists is made, because the account id is only ever a row to
 * delete and a share's absence is the same answer whether the account was ever
 * there.
 */
export function revokeShareForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string,
  targetAccountId: string
): ShareRevokeOutcome {
  if (!isPlaylistOwner(database, playlistId, accountId)) {
    return ShareRevokeOutcome.PlaylistNotFound;
  }

  database.db
    .delete(shares)
    .where(
      and(
        eq(shares.playlistId, playlistId),
        eq(shares.accountId, targetAccountId)
      )
    )
    .run();

  return ShareRevokeOutcome.Ok;
}
