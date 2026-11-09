import type { SQL } from 'drizzle-orm';
import { and, eq, inArray, sql } from 'drizzle-orm';

import type { PlaylistAccess, ShareLevel } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import {
  associations,
  playlists,
  shares
} from '../../../platform/database/schema.js';
import { AccessNeed, ownerGrants, shareLevelsFor } from '../rule.js';

/* An account reaches a playlist it owns or holds a share on; no admin override.
 * Unreachable is null or absent, never forbidden, so the caller answers 404. */

// Raw SQL: the builder cannot express the correlated share lookup cleanly.
// The account id binds first in both, matching the join predicate's order.
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

/* The one access condition: ownership, or a share at a level the need accepts,
 * shared by the page fragment and both track queries. */
export function playlistReaches(accountId: string, need: AccessNeed): SQL {
  const owner = ownerGrants(need)
    ? sql`${playlists.ownerAccountId} = ${accountId}`
    : sql`0 = 1`;
  const levels = shareLevelsFor(need);
  const share =
    levels.length === 0
      ? sql`0 = 1`
      : sql`exists (
          select 1 from ${shares}
          where ${shares.playlistId} = ${playlists.id}
            and ${shares.accountId} = ${accountId}
            and ${inArray(shares.level, [...levels])}
        )`;

  return sql`(${owner} or ${share})`;
}

/* A SQL fragment, so "the playlists I can see" composes into Drizzle. */
export function playlistVisibleTo(
  database: DatabaseHandle,
  accountId: string
): SQL {
  return playlistReaches(accountId, AccessNeed.Read);
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

/* One statement, so a single round trip whatever the user checked. A playlist
 * missing from the map is unreachable, reported like a nonexistent one. */
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

/* The `hasShares` flag, distinct from access on purpose: an owner's 'owner'
 * access tells nothing, and a collaborator must not learn who shares it. */
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

/* An account and the playlists it may hear about. An account that reaches none
 * of the batch is left out. */
export interface TrackAudience {
  accountId: string;
  playlistIds: string[];
}

/* Who may hear about these playlists: one query for the batch, grouped by
 * account, in the order the caller named the playlists. */
export function playlistAudiences(
  database: DatabaseHandle,
  playlistIds: string[]
): TrackAudience[] {
  if (playlistIds.length === 0) {
    return [];
  }

  const levels = shareLevelsFor(AccessNeed.Read);
  const rows = database.db
    .select({
      playlistId: playlists.id,
      ownerAccountId: playlists.ownerAccountId,
      sharedAccountId: shares.accountId
    })
    .from(playlists)
    .leftJoin(
      shares,
      and(
        eq(shares.playlistId, playlists.id),
        inArray(shares.level, [...levels])
      )
    )
    .where(inArray(playlists.id, playlistIds))
    .all();

  const members = new Map<string, Set<string>>();

  for (const row of rows) {
    const accounts = members.get(row.playlistId) ?? new Set<string>();

    if (ownerGrants(AccessNeed.Read)) {
      accounts.add(row.ownerAccountId);
    }

    if (row.sharedAccountId !== null) {
      accounts.add(row.sharedAccountId);
    }

    members.set(row.playlistId, accounts);
  }

  const byAccount = new Map<string, string[]>();

  for (const playlistId of playlistIds) {
    for (const accountId of members.get(playlistId) ?? []) {
      const ids = byAccount.get(accountId) ?? [];
      ids.push(playlistId);
      byAccount.set(accountId, ids);
    }
  }

  return [...byAccount].map(([accountId, ids]) => ({
    accountId,
    playlistIds: ids
  }));
}

/* The single-playlist projection of the batch resolver. */
export function playlistAudience(
  database: DatabaseHandle,
  playlistId: string
): string[] {
  return playlistAudiences(database, [playlistId]).map(
    audience => audience.accountId
  );
}

/* The track projection: its holding playlists, then their audiences. */
export function trackAudience(
  database: DatabaseHandle,
  trackId: string
): TrackAudience[] {
  const playlistIds = database.db
    .selectDistinct({ playlistId: associations.playlistId })
    .from(associations)
    .where(eq(associations.trackId, trackId))
    .all()
    .map(row => row.playlistId);

  return playlistAudiences(database, playlistIds);
}
