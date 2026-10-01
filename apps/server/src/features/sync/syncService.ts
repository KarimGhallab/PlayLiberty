import { randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';

import {
  AssociationOrigin,
  PlaylistSyncStatus,
  Provider,
  SyncRunStatus,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import type { SyncRun } from '@playliberty/contracts';
import { validateYoutubeUrl } from '@playliberty/youtube';
import type { YoutubeUrlInfo } from '@playliberty/youtube';

import { resolvePlaylistAccess } from '../../shared/access/playlistAccess.js';
import type { AppContext } from '../../shared/context.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import {
  associations,
  playlists,
  suppressions,
  syncRuns,
  tracks
} from '../../platform/database/schema.js';
import type { PlaylistRow } from '../../platform/database/schema.js';
import { addAssociation } from '../playlists/associationService.js';
import { markTrackSourceRemoved } from '../tracks/trackLifecycle.js';

/*
 * Syncing a Synced playlist with its Source.
 *
 * A reconcile reads the source through the adapter, so it cannot finish inside a
 * request: starting a sync creates the playlist if it is new, opens a run in
 * `running`, returns it, and lets the reconcile finish in the background, where a
 * client learns the outcome from the latest-run route.
 *
 * One run at a time per playlist. A second request while a run is in flight is
 * refused rather than queued, because two runs would each assign positions and
 * write the playlist's counts and the loser would overwrite the winner's numbers.
 * Ticket 03 adds retention, ticket 04 suppression, and ticket 05 the failure
 * branch's full guarantees.
 */

/*
 * A URL that is not a YouTube playlist or video is not a source. The validator
 * throws by design, so it is wrapped into the answer the route needs rather than
 * left as an exception a route has to remember to catch.
 */
export function resolveSourceUrl(raw: string): YoutubeUrlInfo | null {
  try {
    return validateYoutubeUrl(raw);
  } catch {
    return null;
  }
}

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
  info: YoutubeUrlInfo
): StartOrConflict {
  const database = context.database;

  // Source uniqueness is per owner, so this finds the caller's own playlist for
  // the source and never one belonging to somebody else. The insert is a
  // conflict-no-op rather than a check-then-insert, so two simultaneous pastes of
  // one source cannot both create a playlist.
  const inserted = database.db
    .insert(playlists)
    .values({
      id: randomUUID(),
      ownerAccountId: accountId,
      name: info.sourceId,
      coverUrl: null,
      provider: Provider.Youtube,
      sourcePlaylistId: info.sourceId,
      sourceUrl: info.url,
      syncStatus: PlaylistSyncStatus.Syncing
    })
    .onConflictDoNothing()
    .returning()
    .get();

  // The insert returns the row it created, or nothing when the caller already
  // holds this source. On a conflict the row belongs to the earlier paste, so it
  // is read rather than assumed. The unique index and the conflict clause are what
  // stop two pastes of one source from both creating a playlist.
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

  // A playlist that predates the source URL column, or one the caller re-pasted
  // with a differently normalized URL, is filled in from what was just pasted so
  // the next sync has something to read.
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
  const access = resolvePlaylistAccess(context.database, playlistId, accountId);

  // A read collaborator and a stranger both answer not-found, so the route does
  // not confirm a playlist the caller cannot write. Rename, delete and share
  // management stay with the owner; a write collaborator may sync.
  if (access !== 'owner' && access !== 'write') {
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

  void reconcile(context, run.id, playlist);

  return { outcome: StartSyncOutcome.Started, playlistId: playlist.id, run };
}

/*
 * One pass over the source membership, adding and never subtracting. Ticket 01
 * covers the two cases where nothing is removed: a video the instance has never
 * seen becomes a track queued for download, and a video it already holds gains an
 * association and no second track. A video the playlist already associates is
 * left exactly as it is, which is what makes a second sync change nothing.
 */
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

    let nextPosition = nextPositionFor(database, playlist.id);
    let added = 0;

    for (const item of source.entries) {
      if (isSuppressed(database, playlist.id, item.videoId)) {
        continue;
      }

      const trackId = ensureTrack(
        database,
        item.videoId,
        item.title,
        item.durationSeconds,
        item.thumbnailUrl
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
      source.entries.map(item => item.videoId)
    );

    const name =
      source.title.trim().length > 0 ? source.title : playlist.sourcePlaylistId;
    const coverUrl = source.entries[0]?.thumbnailUrl ?? null;
    const finishedAt = new Date().toISOString();

    // In one transaction, so a client never reads a finished run beside a
    // playlist that still says it is syncing.
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
          coverUrl,
          lastSyncedAt: finishedAt,
          syncStatus: PlaylistSyncStatus.Idle,
          updatedAt: finishedAt
        })
        .where(eq(playlists.id, playlist.id))
        .run();
    })();
  } catch (error) {
    // Ticket 05 owns the guarantees of a failed run; what is here is enough to
    // leave no run hanging and no unhandled rejection.
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
  }
}

function nextPositionFor(database: DatabaseHandle, playlistId: string): number {
  const row = database.db
    .select({ value: sql<number | null>`max(${associations.position})` })
    .from(associations)
    .where(eq(associations.playlistId, playlistId))
    .get();

  return (row?.value ?? -1) + 1;
}

/*
 * A video the source no longer lists does not take its track with it. A stored
 * track keeps its file and is marked remote-removed, which is the retention the
 * product promises; a track that never got a file becomes unavailable rather than
 * sitting queued forever. The flag lives on the track, so every playlist holding
 * it reads the same answer. Only the stored case is a retention, because nothing
 * was kept for a track that had no file.
 */
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

    // The rule lives in one place now, shared with the download worker, so a
    // video that leaves the source and a download that finds it gone agree.
    markTrackSourceRemoved(database, row.trackId, row.fileStatus);

    if (row.fileStatus === TrackFileStatus.Stored) {
      retained += 1;
    }
  }

  return retained;
}

/*
 * A suppression is a video the listener removed from this playlist, and the
 * reconcile honours it rather than reopening the question: the video is skipped
 * and gets no association. The writer is removing a track (spec 04); this reads
 * and never writes one.
 */
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
  videoId: string,
  title: string,
  durationSeconds: number | null,
  thumbnailUrl: string | null
): string {
  const existing = database.db
    .select({ id: tracks.id, fileStatus: tracks.fileStatus })
    .from(tracks)
    .where(eq(tracks.videoId, videoId))
    .get();

  if (existing !== undefined) {
    // A failed download is retried by the next sync: the row goes back to pending
    // so the worker claims it again, and the stale reason goes with it. Every other
    // existing track is left exactly as it is.
    if (existing.fileStatus === TrackFileStatus.Failed) {
      database.db
        .update(tracks)
        .set({
          fileStatus: TrackFileStatus.Pending,
          failureReason: null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(tracks.id, existing.id))
        .run();
    }

    return existing.id;
  }

  const trackId = randomUUID();

  database.db
    .insert(tracks)
    .values({
      id: trackId,
      provider: Provider.Youtube,
      videoId,
      title,
      durationSeconds,
      thumbnailPath: null,
      thumbnailUrl,
      fileStatus: TrackFileStatus.Pending,
      sourceStatus: TrackSourceStatus.Available,
      filePath: null,
      failureReason: null
    })
    .run();

  return trackId;
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
