import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import type {
  Page,
  Playlist,
  PlaylistAccess,
  PlaylistTrack
} from '@playliberty/contracts';

import {
  AccessNeed,
  EntryOutcome,
  playlistEntry
} from '../../shared/access/entry.js';
import type { Entry } from '../../shared/access/entry.js';
import {
  playlistVisibleTo,
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
import { toTrackView } from '../tracks/service/trackService.js';
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

/*
 * The playlist's cover is its first track's thumbnail, so the view carries that
 * track's id and the client renders the track's own thumbnail route. The first
 * association is the lowest position; the single read takes one row, and the
 * batch read groups to the minimum position and joins back to it, so a page of
 * playlists costs one statement and never fetches the whole association table.
 */
function coverTrackId(
  database: DatabaseHandle,
  playlistId: string
): string | null {
  const row = database.db
    .select({ trackId: associations.trackId })
    .from(associations)
    .where(eq(associations.playlistId, playlistId))
    .orderBy(asc(associations.position))
    .limit(1)
    .get();

  return row?.trackId ?? null;
}

function coverTrackIds(
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
    .all();

  for (const row of rows) {
    resolved.set(row.playlistId, row.trackId);
  }

  return resolved;
}

function toPlaylistView(
  row: PlaylistRow,
  access: PlaylistAccess,
  hasShares: boolean,
  coverTrackId: string | null
): Playlist {
  return {
    id: row.id,
    ownerAccountId: row.ownerAccountId,
    name: row.name,
    coverTrackId,
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

/*
 * One playlist's view for an account already known to reach it. The level is the
 * one the entry seam resolved, so the view and the check cannot disagree, and a
 * row that vanished between the check and this read is null.
 */
function readPlaylist(
  database: DatabaseHandle,
  playlistId: string,
  access: PlaylistAccess
): Playlist | null {
  const row = database.db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playlistId))
    .get();

  if (row === undefined) {
    return null;
  }

  return toPlaylistView(
    row,
    access,
    sharedPlaylistIds(database, [playlistId]).has(playlistId),
    coverTrackId(database, playlistId)
  );
}

/*
 * A playlist read's outcome from the entry. A denial and a row that vanished are
 * the same not-found, which is what the route confirms: it answers "gone" for a
 * playlist this account cannot reach and for one that is not there, and never
 * distinguishes them.
 */
function toReadPlaylistResult(
  entry: Entry<Playlist | null>
): ReadPlaylistResult {
  if (entry.outcome === EntryOutcome.Denied) {
    return { outcome: PlaylistOutcome.NotFound };
  }

  if (entry.value === null) {
    return { outcome: PlaylistOutcome.NotFound };
  }

  return { outcome: PlaylistOutcome.Ok, playlist: entry.value };
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
  const covers = coverTrackIds(
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
        sharedIds.has(playlist.id),
        covers.get(playlist.id) ?? null
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
  /*
   * The read need, through the entry seam: access first, so a playlist this
   * account cannot reach never becomes a row that has to be thrown away again,
   * and the 404 is answered from the same decision the list query makes.
   */
  return toReadPlaylistResult(
    playlistEntry(database, playlistId, accountId, AccessNeed.Read, access =>
      readPlaylist(database, playlistId, access)
    )
  );
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
  return toReadPlaylistResult(
    playlistEntry(database, playlistId, accountId, AccessNeed.Owner, access => {
      database.db
        .update(playlists)
        .set({ name, updatedAt: new Date().toISOString() })
        .where(eq(playlists.id, playlistId))
        .run();

      return readPlaylist(database, playlistId, access);
    })
  );
}

/*
 * Changing the playlist's skip-non-music setting, which the owner and a write
 * collaborator may do and a read collaborator may not. The change is not
 * retroactive: it sets the default for tracks created from now on, and every
 * track already created keeps the value it was born with, because a track
 * snapshots the setting at creation and a stored file is shared. The write
 * touches the setting and the row's timestamp and nothing else.
 */
export function updateSkipNonMusicForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string,
  skipNonMusic: boolean
): ReadPlaylistResult {
  return toReadPlaylistResult(
    playlistEntry(database, playlistId, accountId, AccessNeed.Write, access => {
      database.db
        .update(playlists)
        .set({ skipNonMusic, updatedAt: new Date().toISOString() })
        .where(eq(playlists.id, playlistId))
        .run();

      return readPlaylist(database, playlistId, access);
    })
  );
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
  const entry = playlistEntry(
    database,
    playlistId,
    accountId,
    AccessNeed.Owner,
    () => {
      database.db.delete(playlists).where(eq(playlists.id, playlistId)).run();
      return PlaylistOutcome.Ok;
    }
  );

  return entry.outcome === EntryOutcome.Denied
    ? PlaylistOutcome.NotFound
    : entry.value;
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
  const entry = playlistEntry(
    database,
    playlistId,
    accountId,
    AccessNeed.Write,
    () => {
      const outcome = removeAssociation(database, { playlistId, trackId });

      // A removal answers removed or absent; the add outcomes cannot come from
      // it, and only absent is not a successful removal.
      return outcome === AssociationOutcome.Absent
        ? PlaylistOutcome.NotFound
        : PlaylistOutcome.Ok;
    }
  );

  return entry.outcome === EntryOutcome.Denied
    ? PlaylistOutcome.NotFound
    : entry.value;
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
  const entry = playlistEntry(
    database,
    playlistId,
    accountId,
    AccessNeed.Read,
    () => {
      const playlist = database.db
        .select({ trackCount: playlists.trackCount })
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .get();

      if (playlist === undefined) {
        return null;
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
        items: rows.map(toPlaylistTrackView),
        // The stored count, which the association service moves in the same
        // transaction as the association, rather than a second count query over
        // the rows this page already had to read.
        total: playlist.trackCount,
        limit: query.limit,
        offset: query.offset
      };
    }
  );

  if (entry.outcome === EntryOutcome.Denied) {
    return { outcome: PlaylistOutcome.NotFound };
  }

  if (entry.value === null) {
    return { outcome: PlaylistOutcome.NotFound };
  }

  return { outcome: PlaylistOutcome.Ok, page: entry.value };
}
