import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import type { Playlist, PlaylistAccess } from '@playliberty/contracts';
import { PlaylistSort } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../platform/database/client.js';
import type { PlaylistRow } from '../../platform/database/schema.js';
import { associations } from '../../platform/database/schema.js';

/* The one playlist read projection: the detail read, the page read and every
 * mutation answer build their Playlist here, so the cover tie, the access level,
 * the pin and the shares flag cannot drift between paths. */

/* The assembler: one row plus its resolved facts becomes the contract Playlist.
 * Counts are the page's own and are added by its caller. */
export function toPlaylistView(
  row: PlaylistRow,
  access: PlaylistAccess,
  hasShares: boolean,
  pinned: boolean,
  coverTrackId: string | null
): Playlist {
  return {
    id: row.id,
    ownerAccountId: row.ownerAccountId,
    name: row.name,
    coverTrackId,
    coverUpdatedAt: row.coverUpdatedAt,
    provider: row.provider,
    sourcePlaylistId: row.sourcePlaylistId,
    syncStatus: row.syncStatus,
    lastSyncedAt: row.lastSyncedAt,
    trackCount: row.trackCount,
    skipNonMusic: row.skipNonMusic,
    sort: row.sort ?? PlaylistSort.Playlist,
    access,
    hasShares,
    pinned,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

/* The cover: the first association by position, then rowid, so a position tie
 * has one answer whichever read asks; the join keeps the batch one query. */
export function coverTrackIds(
  database: DatabaseHandle,
  playlistIds: string[]
): Map<string, string> {
  const resolved = new Map<string, string>();

  if (playlistIds.length === 0) {
    return resolved;
  }

  const firstPositions = database.db
    .select({
      playlistId: associations.playlistId,
      position: sql<number>`min(${associations.position})`.as('first_position')
    })
    .from(associations)
    .where(inArray(associations.playlistId, playlistIds))
    .groupBy(associations.playlistId)
    .as('first_positions');

  const rows = database.db
    .select({
      playlistId: associations.playlistId,
      trackId: associations.trackId
    })
    .from(associations)
    .innerJoin(
      firstPositions,
      and(
        eq(associations.playlistId, firstPositions.playlistId),
        eq(associations.position, firstPositions.position)
      )
    )
    .orderBy(asc(associations.playlistId), asc(sql`${associations}.rowid`))
    .all();

  for (const row of rows) {
    if (!resolved.has(row.playlistId)) {
      resolved.set(row.playlistId, row.trackId);
    }
  }

  return resolved;
}

/* The single-playlist projection of the batch cover resolver. */
export function coverTrackId(
  database: DatabaseHandle,
  playlistId: string
): string | null {
  return coverTrackIds(database, [playlistId]).get(playlistId) ?? null;
}
