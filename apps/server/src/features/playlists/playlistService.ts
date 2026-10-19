import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import type {
  Page,
  Playlist,
  PlaylistAccess,
  PlaylistTrack,
  PlaylistTracksPage,
  PlaylistWithCounts,
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
  playlistAudience,
  playlistVisibleTo,
  resolvePlaylistAccessMany,
  sharedPlaylistIds
} from '../../shared/access/playlistAccess.js';
import type { LiveEventContext } from '../../shared/events/liveEvents.js';
import { ChangeKind, announce } from '../../shared/events/liveEvents.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import type {
  AssociationRow,
  TrackRow
} from '../../platform/database/schema.js';
import {
  associations,
  playlistPins,
  playlists,
  tracks
} from '../../platform/database/schema.js';
import { toTrackView } from '../tracks/service/trackService.js';
import { AssociationOutcome, removeAssociation } from './associationService.js';
import {
  coverTrackId,
  coverTrackIds,
  toPlaylistView
} from './playlistProjection.js';

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

/* The pin is the row's existence, so one lookup answers the boolean. */
function isPinned(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): boolean {
  return (
    database.db
      .select({ playlistId: playlistPins.playlistId })
      .from(playlistPins)
      .where(
        and(
          eq(playlistPins.accountId, accountId),
          eq(playlistPins.playlistId, playlistId)
        )
      )
      .get() !== undefined
  );
}

/* The access level comes from the entry seam, so the view and the check cannot
 * disagree. */
function readPlaylist(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string,
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
    isPinned(database, playlistId, accountId),
    coverTrackId(database, playlistId)
  );
}

/* A denial and a vanished row are the same not-found, never distinguished. */
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

/*
 * Fixed locale, so the order does not follow how the process started. 'base'
 * folds case and accents into one.
 */
const byName = new Intl.Collator('en', { sensitivity: 'base' });

/* The pinned group is a rank, so the sort reads in the order a reader sees. */
function pinnedRank(pinnedAt: string | null): number {
  return pinnedAt === null ? 1 : 0;
}

export function listPlaylistsForAccount(
  database: DatabaseHandle,
  accountId: string,
  query: ListPlaylistsQuery
): Page<PlaylistWithCounts> {
  const visible = playlistVisibleTo(database, accountId);

  const visibleRows = database.db
    .select({ playlist: playlists, pinnedAt: playlistPins.pinnedAt })
    .from(playlists)
    /* Left join, so an unpinned playlist carries a null instant and sorts after
     * every pin. */
    .leftJoin(
      playlistPins,
      and(
        eq(playlistPins.playlistId, playlists.id),
        eq(playlistPins.accountId, accountId)
      )
    )
    .where(visible)
    /* Qualified: rowid is ambiguous once a second table is in play. It is the
     * base order, separating what the collator cannot so paging is stable. */
    .orderBy(asc(sql`${playlists}.rowid`))
    .all();

  /* Sorted in JS: SQLite has no ICU, so `order by name` would place "Été" after
   * "Zebra". The whole list is sorted; that comparison cannot be a LIMIT. */
  const ordered = [...visibleRows].sort(
    (left, right) =>
      pinnedRank(left.pinnedAt) - pinnedRank(right.pinnedAt) ||
      byName.compare(left.playlist.name, right.playlist.name)
  );

  const rows = ordered.slice(query.offset, query.offset + query.limit);

  const playlistRows = rows.map(row => row.playlist);

  const accessById = resolvePlaylistAccessMany(
    database,
    playlistRows.map(row => row.id),
    accountId
  );
  const sharedIds = sharedPlaylistIds(
    database,
    playlistRows.map(row => row.id)
  );
  const covers = coverTrackIds(
    database,
    playlistRows.map(row => row.id)
  );
  const countsByPlaylist = fileStatusCountsByPlaylist(
    database,
    playlistRows.map(row => row.id)
  );

  return {
    /* A visible row the access resolver did not answer is left out rather than
     * reported as the account's own, so a projection fault cannot over-share. */
    items: rows.flatMap(({ playlist, pinnedAt }) => {
      const access = accessById.get(playlist.id);

      if (access === undefined) {
        return [];
      }

      return [
        {
          ...toPlaylistView(
            playlist,
            access,
            sharedIds.has(playlist.id),
            pinnedAt !== null,
            covers.get(playlist.id) ?? null
          ),
          counts: countsByPlaylist.get(playlist.id) ?? noCounts()
        }
      ];
    }),
    total: visibleRows.length,
    limit: query.limit,
    offset: query.offset
  };
}

export function readPlaylistForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): ReadPlaylistResult {
  /* Access first, so an unreachable playlist never becomes a row, and the 404
   * comes from the same decision the list query makes. */
  return toReadPlaylistResult(
    playlistEntry(database, playlistId, accountId, AccessNeed.Read, access =>
      readPlaylist(database, playlistId, accountId, access)
    )
  );
}

/* A write and its announcement share one interior: a refused write announces
 * nothing because the caller only announces an Ok outcome. */
function announcePlaylistChanged(
  context: LiveEventContext,
  result: ReadPlaylistResult,
  playlistId: string
): ReadPlaylistResult {
  if (result.outcome === PlaylistOutcome.Ok) {
    announce(context, { kind: ChangeKind.PlaylistChanged, playlistId });
  }

  return result;
}

/*
 * Owner alone: a write collaborator answers the same not-found a stranger does.
 * Only name and timestamp are updated; the rest are the source's facts.
 */
export function renamePlaylistForAccount(
  context: LiveEventContext,
  playlistId: string,
  accountId: string,
  name: string
): ReadPlaylistResult {
  const result = toReadPlaylistResult(
    playlistEntry(
      context.database,
      playlistId,
      accountId,
      AccessNeed.Owner,
      access => {
        context.database.db
          .update(playlists)
          .set({ name, updatedAt: new Date().toISOString() })
          .where(eq(playlists.id, playlistId))
          .run();

        return readPlaylist(context.database, playlistId, accountId, access);
      }
    )
  );

  return announcePlaylistChanged(context, result, playlistId);
}

/* Not retroactive: a track snapshots the setting at creation, so this only sets
 * the default from now on. */
export function updateSkipNonMusicForAccount(
  context: LiveEventContext,
  playlistId: string,
  accountId: string,
  skipNonMusic: boolean
): ReadPlaylistResult {
  const result = toReadPlaylistResult(
    playlistEntry(
      context.database,
      playlistId,
      accountId,
      AccessNeed.Write,
      access => {
        context.database.db
          .update(playlists)
          .set({ skipNonMusic, updatedAt: new Date().toISOString() })
          .where(eq(playlists.id, playlistId))
          .run();

        return readPlaylist(context.database, playlistId, accountId, access);
      }
    )
  );

  return announcePlaylistChanged(context, result, playlistId);
}

/* Own order is stored as the absence of a value. */
export function updateSortForAccount(
  context: LiveEventContext,
  playlistId: string,
  accountId: string,
  sort: PlaylistSort
): ReadPlaylistResult {
  const result = toReadPlaylistResult(
    playlistEntry(
      context.database,
      playlistId,
      accountId,
      AccessNeed.Write,
      access => {
        context.database.db
          .update(playlists)
          .set({
            sort: sort === PlaylistSort.Playlist ? null : sort,
            updatedAt: new Date().toISOString()
          })
          .where(eq(playlists.id, playlistId))
          .run();

        return readPlaylist(context.database, playlistId, accountId, access);
      }
    )
  );

  return announcePlaylistChanged(context, result, playlistId);
}

/* Existence is the pin, so pinning upserts. Access is the read need: the
 * handler writes the account's own state, so a read collaborator may pin. */
export function updatePinForAccount(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string,
  pinned: boolean
): ReadPlaylistResult {
  return toReadPlaylistResult(
    playlistEntry(database, playlistId, accountId, AccessNeed.Read, access => {
      if (pinned) {
        database.db
          .insert(playlistPins)
          .values({ accountId, playlistId })
          .onConflictDoUpdate({
            target: [playlistPins.accountId, playlistPins.playlistId],
            set: { pinnedAt: new Date().toISOString() }
          })
          .run();
      } else {
        database.db
          .delete(playlistPins)
          .where(
            and(
              eq(playlistPins.accountId, accountId),
              eq(playlistPins.playlistId, playlistId)
            )
          )
          .run();
      }

      return readPlaylist(database, playlistId, accountId, access);
    })
  );
}

/*
 * The cascade bypasses the association service's write rule, safe because the
 * only count is this row's and it is going. Media is left to the weekly prune.
 * The audience is read before the row goes, because it cannot be read after.
 */
export function deletePlaylistForAccount(
  context: LiveEventContext,
  playlistId: string,
  accountId: string
): PlaylistOutcome {
  const entry = playlistEntry(
    context.database,
    playlistId,
    accountId,
    AccessNeed.Owner,
    () => {
      const accountIds = playlistAudience(context.database, playlistId);

      context.database.db
        .delete(playlists)
        .where(eq(playlists.id, playlistId))
        .run();

      announce(context, {
        kind: ChangeKind.PlaylistRemoved,
        playlistId,
        accountIds
      });

      return PlaylistOutcome.Ok;
    }
  );

  return entry.outcome === EntryOutcome.Denied
    ? PlaylistOutcome.NotFound
    : entry.value;
}

/*
 * The same not-found answers every denial and every absence, revealing neither
 * the playlist nor the membership. Suppression shares the delete's transaction.
 */
export function removeTrackForAccount(
  context: LiveEventContext,
  playlistId: string,
  trackId: string,
  accountId: string
): PlaylistOutcome {
  const entry = playlistEntry(
    context.database,
    playlistId,
    accountId,
    AccessNeed.Write,
    () => {
      const outcome = removeAssociation(context.database, {
        playlistId,
        trackId
      });

      // Only Absent is not a successful removal.
      if (outcome === AssociationOutcome.Absent) {
        return PlaylistOutcome.NotFound;
      }

      announce(context, {
        kind: ChangeKind.TracksChangedForPlaylists,
        playlistIds: [playlistId]
      });

      return PlaylistOutcome.Ok;
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

/* Position first; a date sort falls back to it so equal-addedAt rows cannot
 * swap across a re-fetch. Rowid breaks ties, as positions can collide. */
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

/* The media path and thumbnail URL stay off the wire; neither is metadata. */
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

/* Every state is a key, zero when empty: a state is not absent because nothing
 * has reached it. */
function noCounts(): TrackFileStatusCounts {
  return {
    [TrackFileStatus.Stored]: 0,
    [TrackFileStatus.Pending]: 0,
    [TrackFileStatus.Downloading]: 0,
    [TrackFileStatus.Failed]: 0,
    [TrackFileStatus.Unavailable]: 0
  };
}

/* One grouped query over the whole playlist, not the page or filter. Every
 * playlist gets a zeroed bucket, never a missing key. */
function fileStatusCountsByPlaylist(
  database: DatabaseHandle,
  playlistIds: readonly string[]
): Map<string, TrackFileStatusCounts> {
  const counts = new Map<string, TrackFileStatusCounts>();

  for (const playlistId of playlistIds) {
    counts.set(playlistId, noCounts());
  }

  if (playlistIds.length === 0) {
    return counts;
  }

  const rows = database.db
    .select({
      playlistId: associations.playlistId,
      status: tracks.fileStatus,
      count: sql<number>`count(*)`
    })
    .from(associations)
    .innerJoin(tracks, eq(associations.trackId, tracks.id))
    .where(inArray(associations.playlistId, [...playlistIds]))
    .groupBy(associations.playlistId, tracks.fileStatus)
    .all();

  for (const row of rows) {
    const bucket = counts.get(row.playlistId);

    if (bucket !== undefined) {
      bucket[row.status] = row.count;
    }
  }

  return counts;
}

function fileStatusCounts(
  database: DatabaseHandle,
  playlistId: string
): TrackFileStatusCounts {
  return (
    fileStatusCountsByPlaylist(database, [playlistId]).get(playlistId) ??
    noCounts()
  );
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
        /* Unfiltered: the maintained count; filtered: the state's bucket.
         * Either way the total is filtered, not the whole playlist. */
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
