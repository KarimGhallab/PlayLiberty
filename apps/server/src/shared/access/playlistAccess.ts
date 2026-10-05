import { eq, inArray, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import type { PlaylistAccess } from '@playliberty/contracts';
import type { ShareLevel } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../platform/database/client.js';
import {
  associations,
  playlists,
  shares
} from '../../platform/database/schema.js';

/*
 * Who may see and who may write, for a playlist. One module, because this rule was
 * three copies in three features and the next feature was going to write a fourth.
 *
 * The rule is the whole of it: an account reaches a playlist it owns, or one it
 * holds a share on. There is no global library and an admin role carries no
 * override, so there is no `isAdmin` branch here, and adding one would be a
 * decision rather than an omission.
 *
 * Every function returns `null`, or omits the playlist from a map or a set, for an
 * account that cannot reach it. None of them returns a forbidden, and the
 * distinction is already paid for at the routes: a client rendering a playlist
 * screen has no state for "you may not see this", and a revoked share has to read
 * as gone. A caller sends 404 on null without having to know why.
 */

// Raw SQL for the two reads, and the query builder does not express these cleanly.
// Both answers depend on a correlated lookup into share that may or may not
// match, and a left join that yields a null level is a worse thing to read than a
// nullable column. Every other read in the app goes through Drizzle.
//
// The account id binds first in both statements, matching the join predicate's
// order rather than the where clause's, so the binding list reads in one order and
// not two.
const SINGLE_ACCESS_SQL = `
  select p.owner_account_id as owner, s.level as level
  from playlist p
  left join share s on s.playlist_id = p.id and s.account_id = ?
  where p.id = ?
  limit 1
`;

const MANY_ACCESS_SQL = `
  select p.id as playlist_id, p.owner_account_id as owner, s.level as level
  from playlist p
  left join share s on s.playlist_id = p.id and s.account_id = ?
  where p.id in (%s)
`;

interface AccessRow {
  owner: string;
  level: ShareLevel | null;
}

function toAccess(
  row: AccessRow | undefined,
  accountId: string
): PlaylistAccess | null {
  if (row === undefined) {
    return null;
  }

  if (row.owner === accountId) {
    return 'owner';
  }

  return row.level;
}

/*
 * A fragment for a list query, so "the playlists I can see" composes into Drizzle
 * instead of being fetched and filtered in memory. It sits beside the
 * single-playlist readers because it is the same rule written for a different
 * shape, and two places that each say "visible" is how the copies started.
 */
export function playlistVisibleTo(
  database: DatabaseHandle,
  accountId: string
): SQL {
  return sql`(
    ${playlists.ownerAccountId} = ${accountId}
    or exists (
      select 1 from ${shares}
      where ${shares.playlistId} = ${playlists.id}
        and ${shares.accountId} = ${accountId}
    )
  )`;
}

export function resolvePlaylistAccess(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): PlaylistAccess | null {
  const row = database.sqlite
    .prepare(SINGLE_ACCESS_SQL)
    .get(accountId, playlistId) as AccessRow | undefined;

  return toAccess(row, accountId);
}

/*
 * A batch read, for the one request that resolves many playlists at once. One
 * statement rather than one per playlist, so the request costs a single round trip
 * whatever the user checked. A playlist missing from the map is one this account
 * cannot reach, and the caller reports it exactly as it reports one that does not
 * exist.
 */
export function resolvePlaylistAccessMany(
  database: DatabaseHandle,
  playlistIds: string[],
  accountId: string
): Map<string, PlaylistAccess> {
  const resolved = new Map<string, PlaylistAccess>();

  if (playlistIds.length === 0) {
    return resolved;
  }

  const placeholders = playlistIds.map(() => '?').join(', ');
  const rows = database.sqlite
    .prepare(MANY_ACCESS_SQL.replace('%s', placeholders))
    .all(accountId, ...playlistIds) as (AccessRow & {
    playlist_id: string;
  })[];

  for (const row of rows) {
    const access = toAccess(row, accountId);

    if (access !== null) {
      resolved.set(row.playlist_id, access);
    }
  }

  return resolved;
}

/*
 * Ownership, and only ownership, for the three actions no collaborator has: rename,
 * delete, and managing shares. A write collaborator curates and a read
 * collaborator looks; neither is a second owner, and a share is a grant of access,
 * so an account that could grant access would be an owner wearing a
 * collaborator's label.
 */
export function isPlaylistOwner(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): boolean {
  return resolvePlaylistAccess(database, playlistId, accountId) === 'owner';
}

/*
 * Write access, which is the owner or a write collaborator and not a read one. The
 * sync and the batch add both ask it, and spec 04's remove and retry will, so it
 * is stated once beside the rule it is a slice of rather than open-coded three
 * times. A playlist the account cannot reach resolves to no access and is not
 * writable, so its callers answer not-found exactly as they do for a missing row.
 */
export function canWritePlaylist(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): boolean {
  const access = resolvePlaylistAccess(database, playlistId, accountId);

  return access === 'owner' || access === 'write';
}

/*
 * Which of these playlists are shared with anybody at all, for the `hasShares` flag
 * the playlist view carries. Distinct from the access level on purpose: an owner
 * needs to know a playlist is shared out even though their own access is 'owner'
 * and tells them nothing, and a collaborator needs the same flag without learning
 * who else holds a share.
 */
export function sharedPlaylistIds(
  database: DatabaseHandle,
  playlistIds: string[]
): Set<string> {
  if (playlistIds.length === 0) {
    return new Set();
  }

  const rows = database.db
    .selectDistinct({ playlistId: shares.playlistId })
    .from(shares)
    .where(inArray(shares.playlistId, playlistIds))
    .all();

  return new Set(rows.map(row => row.playlistId));
}

/*
 * Every account that can see a playlist: the owner and each collaborator. It is
 * the audience a live event about the playlist is published to, so the rule for
 * who may see a playlist and the rule for who is told it changed are the same
 * rule read two ways rather than two lists that can drift. A playlist that does
 * not exist has no audience, and a publisher of nothing is a no-op.
 */
export function playlistAudience(
  database: DatabaseHandle,
  playlistId: string
): string[] {
  const owner = database.db
    .select({ ownerAccountId: playlists.ownerAccountId })
    .from(playlists)
    .where(eq(playlists.id, playlistId))
    .get();

  if (owner === undefined) {
    return [];
  }

  const collaborators = database.db
    .select({ accountId: shares.accountId })
    .from(shares)
    .where(eq(shares.playlistId, playlistId))
    .all();

  return [owner.ownerAccountId, ...collaborators.map(row => row.accountId)];
}

/*
 * Who hears a change to a track: the playlists that hold it, and the accounts
 * that can see any of them. A track is shared across playlists and one file is
 * fetched once, so a change to it is a change to every playlist that associates
 * it; the answer names both, because the event carries the playlist ids and the
 * bus needs the accounts. A track no playlist holds has no audience, and a
 * publisher of nothing is a no-op.
 */
export interface TrackAudience {
  playlistIds: string[];
  accountIds: string[];
}

export function trackAudience(
  database: DatabaseHandle,
  trackId: string
): TrackAudience {
  const rows = database.db
    .select({
      playlistId: associations.playlistId,
      ownerAccountId: playlists.ownerAccountId,
      sharedAccountId: shares.accountId
    })
    .from(associations)
    .innerJoin(playlists, eq(associations.playlistId, playlists.id))
    .leftJoin(shares, eq(shares.playlistId, associations.playlistId))
    .where(eq(associations.trackId, trackId))
    .all();

  const playlistIds = new Set<string>();
  const accountIds = new Set<string>();

  for (const row of rows) {
    playlistIds.add(row.playlistId);
    accountIds.add(row.ownerAccountId);

    if (row.sharedAccountId !== null) {
      accountIds.add(row.sharedAccountId);
    }
  }

  return { playlistIds: [...playlistIds], accountIds: [...accountIds] };
}
