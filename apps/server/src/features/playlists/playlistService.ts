import { desc, eq, sql } from 'drizzle-orm';

import type { Page, Playlist, PlaylistAccess } from '@playliberty/contracts';

import {
  playlistVisibleTo,
  resolvePlaylistAccess,
  resolvePlaylistAccessMany,
  sharedPlaylistIds
} from '../../shared/access/playlistAccess.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import type { PlaylistRow } from '../../platform/database/schema.js';
import { playlists } from '../../platform/database/schema.js';

export enum PlaylistOutcome {
  Ok = 'ok',
  NotFound = 'not_found'
}

export type ReadPlaylistResult =
  | { outcome: PlaylistOutcome.Ok; playlist: Playlist }
  | { outcome: PlaylistOutcome.NotFound };

export interface ListPlaylistsQuery {
  limit: number;
  offset: number;
}

function toPlaylistView(
  row: PlaylistRow,
  access: PlaylistAccess,
  hasShares: boolean
): Playlist {
  return {
    id: row.id,
    ownerAccountId: row.ownerAccountId,
    name: row.name,
    coverUrl: row.coverUrl,
    provider: row.provider,
    sourcePlaylistId: row.sourcePlaylistId,
    syncStatus: row.syncStatus,
    lastSyncedAt: row.lastSyncedAt,
    trackCount: row.trackCount,
    access,
    hasShares,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function listPlaylistsForAccount(
  database: DatabaseHandle,
  accountId: string,
  query: ListPlaylistsQuery
): Page<Playlist> {
  const visible = playlistVisibleTo(database, accountId);

  const rows = database.db
    .select()
    .from(playlists)
    .where(visible)
    /*
     * Qualified, because the rowid fallback is ambiguous the moment a second table
     * is in play, and the share table carries a rowid of its own. Two runs can be
     * created inside the same millisecond, so created_at alone would let the same
     * request return a different order on two calls.
     */
    .orderBy(desc(playlists.createdAt), desc(sql`${playlists}.rowid`))
    .limit(query.limit)
    .offset(query.offset)
    .all();

  // Access and sharing are two more questions about the same page, answered in two
  // statements rather than a join per row. The access map cannot be missing a
  // playlist the visibility filter just returned, so the fallback is unreachable;
  // it is there because the compiler cannot see that, and a lie in a Playlist is
  // worse than an unreachable branch.
  const accessById = resolvePlaylistAccessMany(
    database,
    rows.map(row => row.id),
    accountId
  );
  const sharedIds = sharedPlaylistIds(
    database,
    rows.map(row => row.id)
  );

  const counted = database.db
    .select({ total: sql<number>`count(*)` })
    .from(playlists)
    .where(visible)
    .all();

  return {
    items: rows.map(playlist =>
      toPlaylistView(
        playlist,
        accessById.get(playlist.id) ?? 'owner',
        sharedIds.has(playlist.id)
      )
    ),
    total: counted[0]?.total ?? 0,
    limit: query.limit,
    offset: query.offset
  };
}

export function readPlaylistForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): ReadPlaylistResult {
  // Access first, so a playlist this account cannot reach never becomes a row that
  // has to be thrown away again, and the 404 is answered from the same decision
  // the list query makes.
  const access = resolvePlaylistAccess(database, playlistId, accountId);

  if (access === null) {
    return { outcome: PlaylistOutcome.NotFound };
  }

  const row = database.db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playlistId))
    .get();

  if (row === undefined) {
    return { outcome: PlaylistOutcome.NotFound };
  }

  return {
    outcome: PlaylistOutcome.Ok,
    playlist: toPlaylistView(
      row,
      access,
      sharedPlaylistIds(database, [playlistId]).has(playlistId)
    )
  };
}
