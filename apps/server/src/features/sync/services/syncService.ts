import { randomUUID } from 'node:crypto';

import { and, eq, inArray } from 'drizzle-orm';

import type { SyncRun } from '@playliberty/contracts';
import {
  AssociationOrigin,
  PlaylistSyncStatus,
  Provider,
  SyncRunStatus,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import type { YoutubeUrlInfo } from '@playliberty/youtube';

import { canWritePlaylist } from '../../../shared/access/playlistAccess.js';
import type { AppContext } from '../../../shared/context.js';
import { publishPlaylistChanged } from '../../../shared/events/liveEvents.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import type { PlaylistRow } from '../../../platform/database/schema.js';
import {
  associations,
  playlists,
  suppressions,
  syncRuns,
  tracks
} from '../../../platform/database/schema.js';
import {
  addAssociation,
  nextPositionFor
} from '../../playlists/associationService.js';
import { withDownloadQueue } from '../../tracks/downloadQueue/downloadQueue.js';
import type { DownloadQueue } from '../../tracks/downloadQueue/downloadQueue.js';
import { findTrackByVideoId } from '../../tracks/service/trackService.js';
import { markTrackSourceRemoved } from '../../tracks/trackLifecycle/trackLifecycle.js';

/*
 * One run per playlist: a concurrent start is refused, not queued, because two
 * runs would each assign positions and overwrite the playlist's counts. A
 * reconcile cannot finish inside a request, so it runs in the background.
 */

export enum StartSyncOutcome {
  Started = 'started',
  AlreadyRunning = 'already_running',
  PlaylistNotFound = 'playlist_not_found'
}

export type StartOrConflict =
  | { outcome: StartSyncOutcome.Started; playlistId: string; run: SyncRun }
  | { outcome: StartSyncOutcome.AlreadyRunning };

export type StartSyncResult =
  StartOrConflict | { outcome: StartSyncOutcome.PlaylistNotFound };

export function startSyncForSource(
  context: AppContext,
  accountId: string,
  info: YoutubeUrlInfo,
  skipNonMusic: boolean
): StartOrConflict {
  const database = context.database;

  // Conflict-no-op, not check-then-insert, so two simultaneous pastes of one
  // source cannot both create a playlist. Source uniqueness is per owner.
  const inserted = database.db
    .insert(playlists)
    .values({
      id: randomUUID(),
      ownerAccountId: accountId,
      name: info.sourceId,
      provider: Provider.Youtube,
      sourcePlaylistId: info.sourceId,
      sourceUrl: info.url,
      syncStatus: PlaylistSyncStatus.Syncing,
      skipNonMusic
    })
    .onConflictDoNothing()
    .returning()
    .get();

  // On conflict the row belongs to the earlier paste, so read it, not assume.

  const playlist =
    inserted ??
    database.db
      .select()
      .from(playlists)
      .where(
        and(
          eq(playlists.ownerAccountId, accountId),
          eq(playlists.provider, Provider.Youtube),
          eq(playlists.sourcePlaylistId, info.sourceId)
        )
      )
      .get();

  if (playlist === undefined) {
    throw new Error('The playlist could not be created or found.');
  }

  // A playlist whose stored URL differs from what was just pasted is filled in
  // so the next sync has something to read.
  if (playlist.sourceUrl !== info.url) {
    database.db
      .update(playlists)
      .set({ sourceUrl: info.url, updatedAt: new Date().toISOString() })
      .where(eq(playlists.id, playlist.id))
      .run();
  }

  return beginRun(context, playlist);
}

export function startSyncForPlaylist(
  context: AppContext,
  playlistId: string,
  accountId: string
): StartSyncResult {
  const writable = canWritePlaylist(context.database, playlistId, accountId);

  // A read collaborator and a stranger answer not-found alike, so the route
  // confirms nothing. A write collaborator may sync; owner ops stay owner-only.
  if (!writable) {
    return { outcome: StartSyncOutcome.PlaylistNotFound };
  }

  const playlist = context.database.db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playlistId))
    .get();

  if (playlist === undefined) {
    return { outcome: StartSyncOutcome.PlaylistNotFound };
  }

  return beginRun(context, playlist);
}

function beginRun(context: AppContext, playlist: PlaylistRow): StartOrConflict {
  const database = context.database;

  const running = database.db
    .select({ id: syncRuns.id })
    .from(syncRuns)
    .where(
      and(
        eq(syncRuns.playlistId, playlist.id),
        eq(syncRuns.status, SyncRunStatus.Running)
      )
    )
    .get();

  if (running !== undefined) {
    return { outcome: StartSyncOutcome.AlreadyRunning };
  }

  database.db
    .update(playlists)
    .set({
      syncStatus: PlaylistSyncStatus.Syncing,
      updatedAt: new Date().toISOString()
    })
    .where(eq(playlists.id, playlist.id))
    .run();

  const run: SyncRun = {
    id: randomUUID(),
    playlistId: playlist.id,
    status: SyncRunStatus.Running,
    addedCount: 0,
    retainedCount: 0,
    removedCount: 0,
    failedCount: 0,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    error: null
  };

  database.db.insert(syncRuns).values(run).run();

  publishPlaylistChanged(context, playlist.id);

  void reconcile(context, run.id, playlist);

  return { outcome: StartSyncOutcome.Started, playlistId: playlist.id, run };
}

/* One pass adding, never subtracting: an already-associated video is untouched,
 * so a second sync changes nothing. */
async function reconcile(
  context: AppContext,
  runId: string,
  playlist: PlaylistRow
): Promise<void> {
  const database = context.database;

  try {
    if (playlist.sourceUrl === null) {
      throw new Error('The playlist has no source URL to read.');
    }

    const source = await context.youtube.listSource(playlist.sourceUrl);
    const presentVideoIds = source.entries.map(item => item.videoId);

    // A suppression lasts only while the source still lists the video, so one
    // that later returns is treated as new rather than staying removed.
    liftAbsentSuppressions(database, playlist.id, presentVideoIds);

    /* One queueing operation for the whole source, so the worker is woken once
     * at the end. The run is settled and the playlist published first. */
    withDownloadQueue(context, queue => {
      let nextPosition = nextPositionFor(database, playlist.id);
      let added = 0;

      for (const item of source.entries) {
        if (isSuppressed(database, playlist.id, item.videoId)) {
          continue;
        }

        const trackId = ensureTrack(
          database,
          queue,
          item.videoId,
          item.title,
          item.durationSeconds,
          item.thumbnailUrl,
          playlist.skipNonMusic
        );

        if (hasAssociation(database, playlist.id, trackId)) {
          continue;
        }

        addAssociation(database, {
          playlistId: playlist.id,
          trackId,
          origin: AssociationOrigin.Remote,
          position: nextPosition
        });
        nextPosition += 1;
        added += 1;
      }

      const retained = retainAbsentTracks(
        database,
        playlist.id,
        presentVideoIds
      );

      const name =
        source.title.trim().length > 0
          ? source.title
          : playlist.sourcePlaylistId;
      const finishedAt = new Date().toISOString();

      // One transaction, so a client never reads a finished run beside a
      // syncing playlist.
      database.sqlite.transaction(() => {
        database.db
          .update(syncRuns)
          .set({
            status: SyncRunStatus.Completed,
            addedCount: added,
            retainedCount: retained,
            finishedAt
          })
          .where(eq(syncRuns.id, runId))
          .run();

        database.db
          .update(playlists)
          .set({
            name,
            lastSyncedAt: finishedAt,
            syncStatus: PlaylistSyncStatus.Idle,
            updatedAt: finishedAt
          })
          .where(eq(playlists.id, playlist.id))
          .run();
      })();

      publishPlaylistChanged(context, playlist.id);
    });
  } catch (error) {
    // Enough to leave no run hanging and no unhandled rejection.
    const finishedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message : 'The sync failed.';

    database.sqlite.transaction(() => {
      database.db
        .update(syncRuns)
        .set({ status: SyncRunStatus.Failed, error: message, finishedAt })
        .where(eq(syncRuns.id, runId))
        .run();

      database.db
        .update(playlists)
        .set({
          syncStatus: PlaylistSyncStatus.Error,
          lastSyncedAt: finishedAt,
          updatedAt: finishedAt
        })
        .where(eq(playlists.id, playlist.id))
        .run();
    })();

    publishPlaylistChanged(context, playlist.id);
  }
}

/* The source dropping a video does not take its track: stored keeps its file,
 * no-file becomes unavailable, and the flag is per track. */
function retainAbsentTracks(
  database: DatabaseHandle,
  playlistId: string,
  presentVideoIds: string[]
): number {
  const present = new Set(presentVideoIds);
  const rows = database.db
    .select({
      trackId: tracks.id,
      videoId: tracks.videoId,
      fileStatus: tracks.fileStatus,
      sourceStatus: tracks.sourceStatus
    })
    .from(associations)
    .innerJoin(tracks, eq(associations.trackId, tracks.id))
    .where(eq(associations.playlistId, playlistId))
    .all();

  let retained = 0;

  for (const row of rows) {
    if (
      present.has(row.videoId) ||
      row.sourceStatus === TrackSourceStatus.Removed
    ) {
      continue;
    }

    // The shared rule: a source drop and a download that finds it gone agree.
    markTrackSourceRemoved(database, row.trackId);

    if (row.fileStatus === TrackFileStatus.Stored) {
      retained += 1;
    }
  }

  return retained;
}

/* Lifts only suppressions whose video the source no longer lists: a removal is
 * a playlist choice, not a permanent deletion. */
function liftAbsentSuppressions(
  database: DatabaseHandle,
  playlistId: string,
  presentVideoIds: string[]
): void {
  const present = new Set(presentVideoIds);

  const absent = database.db
    .select({ videoId: suppressions.videoId })
    .from(suppressions)
    .where(eq(suppressions.playlistId, playlistId))
    .all()
    .map(row => row.videoId)
    .filter(videoId => !present.has(videoId));

  if (absent.length === 0) {
    return;
  }

  database.db
    .delete(suppressions)
    .where(
      and(
        eq(suppressions.playlistId, playlistId),
        inArray(suppressions.videoId, absent)
      )
    )
    .run();
}

/* A suppression is a video the listener removed, so the reconcile skips it. */
function isSuppressed(
  database: DatabaseHandle,
  playlistId: string,
  videoId: string
): boolean {
  return (
    database.db
      .select({ videoId: suppressions.videoId })
      .from(suppressions)
      .where(
        and(
          eq(suppressions.playlistId, playlistId),
          eq(suppressions.videoId, videoId)
        )
      )
      .get() !== undefined
  );
}

function ensureTrack(
  database: DatabaseHandle,
  queue: DownloadQueue,
  videoId: string,
  title: string,
  durationSeconds: number | null,
  thumbnailUrl: string | null,
  skipNonMusic: boolean
): string {
  const existing = findTrackByVideoId(database, videoId);

  if (existing !== undefined) {
    // A failed download is retried by the next sync; other tracks are left
    // untouched, the one way sync's reuse differs from the batch add's.
    if (existing.fileStatus === TrackFileStatus.Failed) {
      queue.retry(existing.id);
    }

    return existing.id;
  }

  return queue.create({
    videoId,
    title,
    durationSeconds,
    thumbnailUrl,
    // First-wins dedup: a later playlist cannot change the track's setting.
    skipNonMusic
  });
}

function hasAssociation(
  database: DatabaseHandle,
  playlistId: string,
  trackId: string
): boolean {
  return (
    database.db
      .select({ id: associations.id })
      .from(associations)
      .where(
        and(
          eq(associations.playlistId, playlistId),
          eq(associations.trackId, trackId)
        )
      )
      .get() !== undefined
  );
}
