import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import type {
  Page,
  Playlist,
  PlaylistAccess,
  PlaylistTrack,
  PlaylistTracksPage,
  TrackFileStatusCounts
} from '@playliberty/contracts';
import { PlaylistSort, TrackFileStatus } from '@playliberty/contracts';

import type { Entry } from '../../shared/access/entry.js';
import {
  AccessNeed,
  EntryOutcome,
  playlistEntry
} from '../../shared/access/entry.js';
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
 * The cover is the playlist's first track's thumbnail, carried as a track id so
 * the client renders the track's own thumbnail route.
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
    sort: row.sort ?? PlaylistSort.Playlist,
    access,
    hasShares,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

/*
 * The access level is the one the entry seam resolved, so the view and the check
 * cannot disagree; a row that vanished between the check and this read is null.
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
 * A denial and a row that vanished are the same not-found: the route answers
 * "gone" for a playlist this account cannot reach and for one that is not there,
 * and never distinguishes them.
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

  // The access map cannot be missing a playlist the visibility filter just
  // returned, so the `?? 'owner'` fallback is unreachable; it is there because the
  // compiler cannot see that, and a lie in a Playlist is worse than an
  // unreachable branch.
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
   * Access first, so a playlist this account cannot reach never becomes a row
   * that has to be thrown away again, and the 404 is answered from the same
   * decision the list query makes.
   */
  return toReadPlaylistResult(
    playlistEntry(database, playlistId, accountId, AccessNeed.Read, access =>
      readPlaylist(database, playlistId, access)
    )
  );
}

/*
 * Renaming belongs to the owner alone, so a write collaborator who may curate
 * answers the same not-found a stranger does. The update touches the name and the
 * row's timestamp and nothing else: the source, the cover, the last-synced time
 * and the sync status are the source's facts, not the owner's.
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
 * The change is not retroactive: it sets the default for tracks created from now
 * on, because a track snapshots the setting at creation and a stored file is
 * shared.
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
 * The playlist's own order is stored as the absence, so a playlist that was never
 * sorted carries no value.
 */
export function updateSortForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string,
  sort: PlaylistSort
): ReadPlaylistResult {
  return toReadPlaylistResult(
    playlistEntry(database, playlistId, accountId, AccessNeed.Write, access => {
      database.db
        .update(playlists)
        .set({
          sort: sort === PlaylistSort.Playlist ? null : sort,
          updatedAt: new Date().toISOString()
        })
        .where(eq(playlists.id, playlistId))
        .run();

      return readPlaylist(database, playlistId, access);
    })
  );
}

/*
 * The associations and shares go with the row through the foreign key cascade,
 * bypassing the association service's rule that an association is only ever
 * written through it; that is safe because the only stored count needing an
 * adjustment is this playlist's own, and that row is going. The media is left to
 * the weekly prune, which reclaims a file once no association names its track, so
 * the delete never waits on the disk.
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
 * The same not-found answers a read collaborator, a stranger, a playlist that
 * does not exist and an association that is not there, so the route confirms
 * neither a playlist nor a membership the caller may not touch. The suppression
 * is written by the association service in the same transaction as the delete, so
 * no caller can remove without suppressing.
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
  state?: TrackFileStatus;
}

export type ReadPlaylistTracksResult =
  | { outcome: PlaylistOutcome.Ok; page: PlaylistTracksPage }
  | { outcome: PlaylistOutcome.NotFound };

/*
 * The order a playlist's tracks are read in, from the playlist's saved sort. The
 * playlist's own order is position first, and a date sort falls back to it for a
 * tie: a sync that adds many rows in one instant gives them equal dates, and a
 * client that fetched the same page twice must not see the rows swap. The
 * association's rowid is the last tiebreak, because two associations in one run
 * can share a position and the playlist route already breaks that tie this way.
 */
function playlistTrackOrder(sort: PlaylistSort | null) {
  const ownOrder = [
    asc(associations.position),
    asc(sql`${associations}.rowid`)
  ];

  if (sort === PlaylistSort.NewestFirst) {
    return [desc(associations.addedAt), ...ownOrder];
  }

  if (sort === PlaylistSort.OldestFirst) {
    return [asc(associations.addedAt), ...ownOrder];
  }

  return ownOrder;
}

/*
 * The stored track carries two fields the contract does not, the media path the
 * stream route resolves and the thumbnail URL the source reported; neither is
 * metadata, so neither crosses the wire here.
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

/*
 * Over the whole playlist rather than the page or the filter, and grouped by file
 * status alone, so the removed-from-source overlay is not a bucket. Every state is
 * a key, including the ones with no rows, because a state is not absent merely
 * because nothing is in it.
 */
function fileStatusCounts(
  database: DatabaseHandle,
  playlistId: string
): TrackFileStatusCounts {
  const rows = database.db
    .select({ status: tracks.fileStatus, count: sql<number>`count(*)` })
    .from(associations)
    .innerJoin(tracks, eq(associations.trackId, tracks.id))
    .where(eq(associations.playlistId, playlistId))
    .groupBy(tracks.fileStatus)
    .all();

  const counts: TrackFileStatusCounts = {
    [TrackFileStatus.Stored]: 0,
    [TrackFileStatus.Pending]: 0,
    [TrackFileStatus.Downloading]: 0,
    [TrackFileStatus.Failed]: 0,
    [TrackFileStatus.Unavailable]: 0
  };

  for (const row of rows) {
    counts[row.status] = row.count;
  }

  return counts;
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
        .select({ trackCount: playlists.trackCount, sort: playlists.sort })
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .get();

      if (playlist === undefined) {
        return null;
      }

      const counts = fileStatusCounts(database, playlistId);

      // The state narrows the page and never the counts beside it.
      const rows = database.db
        .select({ association: associations, track: tracks })
        .from(associations)
        .innerJoin(tracks, eq(associations.trackId, tracks.id))
        .where(
          query.state === undefined
            ? eq(associations.playlistId, playlistId)
            : and(
                eq(associations.playlistId, playlistId),
                eq(tracks.fileStatus, query.state)
              )
        )
        .orderBy(...playlistTrackOrder(playlist.sort))
        .limit(query.limit)
        .offset(query.offset)
        .all();

      return {
        items: rows.map(toPlaylistTrackView),
        /*
         * The maintained stored count when nothing is filtered, rather than a
         * second count over the rows; the state's own bucket when one is. Either
         * way the total is the filtered total, not the whole playlist's.
         */
        total:
          query.state === undefined ? playlist.trackCount : counts[query.state],
        limit: query.limit,
        offset: query.offset,
        counts
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

export type ReadPlaylistQueueResult =
  | { outcome: PlaylistOutcome.Ok; items: PlaylistTrack[] }
  | { outcome: PlaylistOutcome.NotFound };

export function listPlaylistQueueForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): ReadPlaylistQueueResult {
  const entry = playlistEntry(
    database,
    playlistId,
    accountId,
    AccessNeed.Read,
    () => {
      const playlist = database.db
        .select({ sort: playlists.sort })
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .get();

      const rows = database.db
        .select({ association: associations, track: tracks })
        .from(associations)
        .innerJoin(tracks, eq(associations.trackId, tracks.id))
        .where(eq(associations.playlistId, playlistId))
        .orderBy(...playlistTrackOrder(playlist?.sort ?? null))
        .all();

      return rows.map(toPlaylistTrackView);
    }
  );

  if (entry.outcome === EntryOutcome.Denied) {
    return { outcome: PlaylistOutcome.NotFound };
  }

  return { outcome: PlaylistOutcome.Ok, items: entry.value };
}
