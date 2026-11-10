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
import { EgressCircuitOpenError, failureOf } from '@playliberty/youtube';

import {
  AccessNeed,
  EntryOutcome,
  playlistEntry
} from '../../../../shared/access/entry/entry.js';
import type { AppContext } from '../../../../shared/context.js';
import { ChangeKind, announce } from '../../../../shared/events/liveEvents.js';
import type { Refused, Succeeded } from '../../../../shared/refusal.js';
import { Refusal } from '../../../../shared/refusal.js';

import type { DatabaseHandle } from '../../../../platform/database/client.js';
import type { PlaylistRow } from '../../../../platform/database/schema.js';
import {
  associations,
  playlists,
  suppressions,
  syncRuns,
  tracks
} from '../../../../platform/database/schema.js';
import {
  addAssociation,
  nextPositionFor
} from '../../../playlists/associationService.js';
import type { DownloadQueue } from '../../../tracks/downloadQueue/downloadQueue.js';
import { withDownloadQueue } from '../../../tracks/downloadQueue/downloadQueue.js';
import { findTrackByVideoId } from '../../../tracks/service/trackService.js';
import { markTrackSourceRemoved } from '../../../tracks/trackLifecycle/trackLifecycle.js';

/* One run per playlist: a concurrent start is refused, not queued, because two
 * runs would assign positions twice. The reconcile runs in the background. */

export type StartSyncResult =
  { outcome: 'ok'; playlistId: string; run: SyncRun } | Refused;

export function startSyncForSource(
  context: AppContext,
  accountId: string,
  info: YoutubeUrlInfo,
  skipNonMusic: boolean
): StartSyncResult {
  const database = context.database;

  const begun = database.unitOfWork(
    (): {
      started: StartSyncResult;
      playlist: PlaylistRow;
    } => {
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

      // A playlist whose stored URL differs from what was just pasted is filled
      // in so the next sync has something to read.
      if (playlist.sourceUrl !== info.url) {
        database.db
          .update(playlists)
          .set({ sourceUrl: info.url, updatedAt: new Date().toISOString() })
          .where(eq(playlists.id, playlist.id))
          .run();
      }

      return { started: beginRun(database, playlist), playlist };
    }
  );

  if (begun.started.outcome === 'ok') {
    announce(context, {
      kind: ChangeKind.PlaylistChanged,
      playlistId: begun.playlist.id
    });
    void reconcile(context, begun.started.run.id, begun.playlist);
  }

  return begun.started;
}

export function startSyncForPlaylist(
  context: AppContext,
  playlistId: string,
  accountId: string
): StartSyncResult {
  const entry = playlistEntry(
    context.database,
    playlistId,
    accountId,
    AccessNeed.Write,
    () =>
      context.database.db
        .select()
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .get() ?? null
  );

  // A read collaborator and a stranger answer not-found alike, so the route
  // confirms nothing. A write collaborator may sync; owner ops stay owner-only.
  if (entry.outcome === EntryOutcome.Denied) {
    return { outcome: 'refused', refusal: Refusal.PlaylistNotFoundWrite };
  }

  const playlist = entry.value;

  if (playlist === null) {
    return { outcome: 'refused', refusal: Refusal.PlaylistNotFoundWrite };
  }

  const started = context.database.unitOfWork(() =>
    beginRun(context.database, playlist)
  );

  if (started.outcome === 'ok') {
    announce(context, {
      kind: ChangeKind.PlaylistChanged,
      playlistId: playlist.id
    });
    void reconcile(context, started.run.id, playlist);
  }

  return started;
}

/* The cancel owns the terminal state: the route commits it before answering,
 * and the reconcile below stops at its next checkpoint instead of overwriting. */
export function cancelSyncForPlaylist(
  context: AppContext,
  playlistId: string,
  accountId: string
): Succeeded | Refused {
  const entry = playlistEntry(
    context.database,
    playlistId,
    accountId,
    AccessNeed.Write,
    () => null
  );

  if (entry.outcome === EntryOutcome.Denied) {
    return { outcome: 'refused', refusal: Refusal.PlaylistNotFoundWrite };
  }

  const transitioned = context.database.unitOfWork(() => {
    const running = context.database.db
      .select({ id: syncRuns.id })
      .from(syncRuns)
      .where(
        and(
          eq(syncRuns.playlistId, playlistId),
          eq(syncRuns.status, SyncRunStatus.Running)
        )
      )
      .get();

    if (running === undefined) {
      return false;
    }

    const finishedAt = new Date().toISOString();

    context.database.db
      .update(syncRuns)
      .set({
        status: SyncRunStatus.Cancelled,
        finishedAt,
        error: null
      })
      .where(
        and(
          eq(syncRuns.playlistId, playlistId),
          eq(syncRuns.status, SyncRunStatus.Running)
        )
      )
      .run();

    context.database.db
      .update(playlists)
      .set({
        syncStatus: PlaylistSyncStatus.Idle,
        updatedAt: finishedAt
      })
      .where(eq(playlists.id, playlistId))
      .run();

    return true;
  });

  if (transitioned) {
    announce(context, {
      kind: ChangeKind.PlaylistChanged,
      playlistId
    });
  }

  return { outcome: 'ok' };
}

/* The run and the syncing state are one write: a failed insert leaves the
 * playlist as it was. The caller owns the unit and the announcement. */
function beginRun(
  database: DatabaseHandle,
  playlist: PlaylistRow
): StartSyncResult {
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
    return { outcome: 'refused', refusal: Refusal.SyncAlreadyRunning };
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

  return { outcome: 'ok', playlistId: playlist.id, run };
}

/* The run row is the arbiter: a cancel or recovery that made it terminal must
 * stop this pass before it writes or announces. */
function runIsRunning(database: DatabaseHandle, runId: string): boolean {
  return (
    database.db
      .select({ id: syncRuns.id })
      .from(syncRuns)
      .where(
        and(eq(syncRuns.id, runId), eq(syncRuns.status, SyncRunStatus.Running))
      )
      .get() !== undefined
  );
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

    if (!runIsRunning(database, runId)) {
      return;
    }

    const presentVideoIds = source.entries.map(item => item.videoId);

    /* One queueing operation for the whole source, so the worker is woken once
     * after the unit commits. A throw rolls the pass back and skips the wake. */
    const committed = withDownloadQueue(context, queue =>
      database.unitOfWork(() => {
        if (!runIsRunning(database, runId)) {
          return false;
        }

        // A suppression lasts only while the source still lists the video, so
        // one that later returns is treated as new rather than staying removed.
        liftAbsentSuppressions(database, playlist.id, presentVideoIds);

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

        return true;
      })
    );

    if (!committed) {
      return;
    }

    announce(context, {
      kind: ChangeKind.PlaylistChanged,
      playlistId: playlist.id
    });
  } catch (error) {
    // Enough to leave no run hanging and no unhandled rejection.
    const finishedAt = new Date().toISOString();
    /* An open circuit is the source being unreachable, not a playlist error:
     * one fixed sentence, and a state the gallery can name. */
    const blocked = error instanceof EgressCircuitOpenError;
    const message = blocked
      ? failureOf(error).sentence
      : error instanceof Error
        ? error.message
        : 'The sync failed.';

    const failed = database.unitOfWork(() => {
      if (!runIsRunning(database, runId)) {
        return false;
      }

      database.db
        .update(syncRuns)
        .set({ status: SyncRunStatus.Failed, error: message, finishedAt })
        .where(eq(syncRuns.id, runId))
        .run();

      database.db
        .update(playlists)
        .set({
          syncStatus: blocked
            ? PlaylistSyncStatus.Blocked
            : PlaylistSyncStatus.Error,
          lastSyncedAt: finishedAt,
          updatedAt: finishedAt
        })
        .where(eq(playlists.id, playlist.id))
        .run();

      return true;
    });

    if (!failed) {
      return;
    }

    announce(context, {
      kind: ChangeKind.PlaylistChanged,
      playlistId: playlist.id
    });
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
