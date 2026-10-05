import { asc, desc, eq, sql } from 'drizzle-orm';

import type {
  Page,
  Playlist,
  PlaylistAccess,
  PlaylistTrack
} from '@playliberty/contracts';

import {
  canWritePlaylist,
  isPlaylistOwner,
  playlistVisibleTo,
  resolvePlaylistAccess,
  resolvePlaylistAccessMany,
  sharedPlaylistIds
} from '../../shared/access/playlistAccess.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import type {
  AssociationRow,
  PlaylistRow,
  TrackRow
} from '../../platform/database/schema.js';
import {
  associations,
  playlists,
  tracks
} from '../../platform/database/schema.js';
import { toTrackView } from '../tracks/trackService.js';
import { AssociationOutcome, removeAssociation } from './associationService.js';

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
    skipNonMusic: row.skipNonMusic,
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

/*
 * Renaming belongs to the owner alone, so a write collaborator who may curate
 * answers the same not-found a stranger does, and the route never confirms a
 * playlist the caller may not manage. The update touches the name and the row's
 * updated timestamp and nothing else: not the source, the cover, the last-synced
 * time or the sync status, because those are the source's facts and this is the
 * owner's.
 */
export function renamePlaylistForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string,
  name: string
): ReadPlaylistResult {
  if (!isPlaylistOwner(database, playlistId, accountId)) {
    return { outcome: PlaylistOutcome.NotFound };
  }

  database.db
    .update(playlists)
    .set({ name, updatedAt: new Date().toISOString() })
    .where(eq(playlists.id, playlistId))
    .run();

  return readPlaylistForAccount(database, playlistId, accountId);
}

/*
 * Deleting belongs to the owner alone, so the not-found is the same one a stranger
 * gets. The associations and the shares go with the row through the foreign key
 * cascade, which is the one place the association service's rule, that an
 * association is only ever written through it, is bypassed, and it is safe because
 * the only stored count that would need adjusting is this playlist's own and that
 * row is going. The media is left alone: the weekly prune reclaims a file once no
 * association names its track, so the delete never waits on the disk.
 */
export function deletePlaylistForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): PlaylistOutcome {
  if (!isPlaylistOwner(database, playlistId, accountId)) {
    return PlaylistOutcome.NotFound;
  }

  database.db.delete(playlists).where(eq(playlists.id, playlistId)).run();

  return PlaylistOutcome.Ok;
}

/*
 * Removing a track belongs to the owner or a write collaborator. The answer is the
 * same not-found for a read collaborator, a stranger, a playlist that does not
 * exist and an association that is not there, so the route confirms neither a
 * playlist nor a membership the caller may not touch. The suppression is written
 * by the association service in the same transaction as the delete, so no caller
 * can remove without suppressing.
 */
export function removeTrackForAccount(
  database: DatabaseHandle,
  playlistId: string,
  trackId: string,
  accountId: string
): PlaylistOutcome {
  if (!canWritePlaylist(database, playlistId, accountId)) {
    return PlaylistOutcome.NotFound;
  }

  const outcome = removeAssociation(database, { playlistId, trackId });

  // A removal answers removed or absent; the add outcomes cannot come from it, and
  // only absent is not a successful removal.
  return outcome === AssociationOutcome.Absent
    ? PlaylistOutcome.NotFound
    : PlaylistOutcome.Ok;
}

export interface ListPlaylistTracksQuery {
  limit: number;
  offset: number;
}

export type ReadPlaylistTracksResult =
  | { outcome: PlaylistOutcome.Ok; page: Page<PlaylistTrack> }
  | { outcome: PlaylistOutcome.NotFound };

/*
 * The stored track carries two fields the contract does not: the media path the
 * stream route resolves, and the thumbnail URL the download wrote. Neither is
 * metadata, so neither crosses the wire here; the artwork is reached through the
 * track's own route.
 */
function toPlaylistTrackView(row: {
  association: AssociationRow;
  track: TrackRow;
}): PlaylistTrack {
  return {
    track: toTrackView(row.track),
    origin: row.association.origin,
    position: row.association.position
  };
}

export function listPlaylistTracksForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string,
  query: ListPlaylistTracksQuery
): ReadPlaylistTracksResult {
  // The same access decision the two playlist reads make, so a playlist this
  // account cannot reach answers the same 404 rather than a forbidden.
  const access = resolvePlaylistAccess(database, playlistId, accountId);

  if (access === null) {
    return { outcome: PlaylistOutcome.NotFound };
  }

  const playlist = database.db
    .select({ trackCount: playlists.trackCount })
    .from(playlists)
    .where(eq(playlists.id, playlistId))
    .get();

  if (playlist === undefined) {
    return { outcome: PlaylistOutcome.NotFound };
  }

  // The association is membership, and this is the only join: a track held by
  // another playlist has no row here, and a track held by this playlist and
  // another has exactly one, so neither leaks and neither doubles.
  const rows = database.db
    .select({ association: associations, track: tracks })
    .from(associations)
    .innerJoin(tracks, eq(associations.trackId, tracks.id))
    .where(eq(associations.playlistId, playlistId))
    .orderBy(asc(associations.position), asc(sql`${associations}.rowid`))
    .limit(query.limit)
    .offset(query.offset)
    .all();

  return {
    outcome: PlaylistOutcome.Ok,
    page: {
      items: rows.map(toPlaylistTrackView),
      // The stored count, which the association service moves in the same
      // transaction as the association, rather than a second count query over the
      // rows this page already had to read.
      total: playlist.trackCount,
      limit: query.limit,
      offset: query.offset
    }
  };
}
