import { and, desc, eq, exists, inArray, or, sql } from 'drizzle-orm';

import type { Page, Playlist, PlaylistAccess } from '@playliberty/contracts';
import { ShareLevel } from '@playliberty/contracts';

import type { DatabaseHandle } from '../db/client.js';
import type { PlaylistRow } from '../db/schema.js';
import { playlists, shares } from '../db/schema.js';

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

function visibleTo(database: DatabaseHandle, accountId: string) {
  return or(
    eq(playlists.ownerAccountId, accountId),
    exists(
      database.db
        .select({ one: sql`1` })
        .from(shares)
        .where(
          and(
            eq(shares.playlistId, playlists.id),
            eq(shares.accountId, accountId)
          )
        )
    )
  );
}

function playlistIdsWithAnyShare(
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

function accessFor(
  row: PlaylistRow,
  accountId: string,
  shareLevel: ShareLevel | null
): PlaylistAccess {
  if (row.ownerAccountId === accountId) {
    return 'owner';
  }

  if (shareLevel === null) {
    throw new Error(
      'a playlist that is neither owned nor shared has no level of access'
    );
  }

  return shareLevel;
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
  const visible = visibleTo(database, accountId);

  const rows = database.db
    .select({ playlist: playlists, shareLevel: shares.level })
    .from(playlists)
    .leftJoin(
      shares,
      and(eq(shares.playlistId, playlists.id), eq(shares.accountId, accountId))
    )
    .where(visible)
    /*
     * Qualified, because the join puts a second table in the query and an
     * unqualified rowid is ambiguous once it does. The share table has one too.
     */
    .orderBy(desc(playlists.createdAt), desc(sql`${playlists}.rowid`))
    .limit(query.limit)
    .offset(query.offset)
    .all();

  const sharedIds = playlistIdsWithAnyShare(
    database,
    rows.map(row => row.playlist.id)
  );

  const counted = database.db
    .select({ total: sql<number>`count(*)` })
    .from(playlists)
    .where(visible)
    .all();

  return {
    items: rows.map(({ playlist, shareLevel }) =>
      toPlaylistView(
        playlist,
        accessFor(playlist, accountId, shareLevel),
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
  const row = database.db
    .select({ playlist: playlists, shareLevel: shares.level })
    .from(playlists)
    .leftJoin(
      shares,
      and(eq(shares.playlistId, playlists.id), eq(shares.accountId, accountId))
    )
    .where(and(eq(playlists.id, playlistId), visibleTo(database, accountId)))
    .get();

  if (row === undefined) {
    return { outcome: PlaylistOutcome.NotFound };
  }

  return {
    outcome: PlaylistOutcome.Ok,
    playlist: toPlaylistView(
      row.playlist,
      accessFor(row.playlist, accountId, row.shareLevel),
      playlistIdsWithAnyShare(database, [playlistId]).has(playlistId)
    )
  };
}
