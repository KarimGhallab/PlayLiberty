import { randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';

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
import { validateYoutubeUrl } from '@playliberty/youtube';

import type { AppContext } from '../../shared/context.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import {
  associations,
  playlists,
  syncRuns,
  tracks
} from '../../platform/database/schema.js';
import { addAssociation } from '../playlists/associationService.js';

/*
 * Syncing a Synced playlist with its Source.
 *
 * The reconcile reads the source through the adapter, so it cannot finish inside
 * a request: `startSyncForSource` creates the playlist if it is new, opens a run
 * in `running`, returns it, and lets the reconcile finish in the background,
 * where a client learns the outcome from the latest-run route. Ticket 02 opens
 * the same run on an existing playlist; ticket 03 adds retention, ticket 04
 * suppression, and ticket 05 the failure branch's full guarantees.
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

export interface StartedSync {
  playlistId: string;
  run: SyncRun;
}

export function startSyncForSource(
  context: AppContext,
  accountId: string,
  info: YoutubeUrlInfo
): StartedSync {
  const database = context.database;

  // Source uniqueness is per owner, so this finds the caller's own playlist for
  // the source and never one belonging to somebody else. The insert is a
  // conflict-no-op rather than a check-then-insert, so two simultaneous pastes of
  // one source cannot both create a playlist.
  const playlistId = randomUUID();
  const syncRunId = randomUUID();

  const { changes } = database.db
    .insert(playlists)
    .values({
      id: playlistId,
      ownerAccountId: accountId,
      name: info.sourceId,
      coverUrl: null,
      provider: Provider.Youtube,
      sourcePlaylistId: info.sourceId,
      syncStatus: PlaylistSyncStatus.Syncing,
      updatedAt: new Date().toISOString()
    })
    .onConflictDoNothing()
    .run();

  if (changes !== 1) {
    throw new Error('The playlist could not be created or found.');
  }

  const run: SyncRun = {
    id: syncRunId,
    playlistId: playlistId,
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

  void reconcile(context, run.id, playlistId, info);

  return { playlistId: playlistId, run };
}

/*
 * One pass over the source membership, adding and never subtracting. Ticket 01
 * covers the two cases where nothing is removed: a video the instance has never
 * seen becomes a track queued for download, and a video it already holds gains an
 * association and no second track. A video the playlist already associates is
 * left exactly where it is.
 */
async function reconcile(
  context: AppContext,
  runId: string,
  playlistId: string,
  info: YoutubeUrlInfo
): Promise<void> {
  const database = context.database;

  try {
    const source = await context.youtube.listSource(info.url);

    let nextPosition = nextPositionFor(database, playlistId);
    let added = 0;

    for (const item of source.entries) {
      const trackId = ensureTrack(
        database,
        item.videoId,
        item.title,
        item.durationSeconds
      );

      if (hasAssociation(database, playlistId, trackId)) {
        continue;
      }

      addAssociation(database, {
        playlistId,
        trackId,
        origin: AssociationOrigin.Remote,
        position: nextPosition
      });
      nextPosition += 1;
      added += 1;
    }

    const name = source.title.trim().length > 0 ? source.title : info.sourceId;
    const coverUrl = source.entries[0]?.thumbnailUrl ?? null;
    const finishedAt = new Date().toISOString();

    // In one transaction, so a client never reads a finished run beside a
    // playlist that still says it is syncing.
    database.sqlite.transaction(() => {
      database.db
        .update(syncRuns)
        .set({ status: SyncRunStatus.Completed, addedCount: added, finishedAt })
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
        .where(eq(playlists.id, playlistId))
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
        .where(eq(playlists.id, playlistId))
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

function ensureTrack(
  database: DatabaseHandle,
  videoId: string,
  title: string,
  durationSeconds: number | null
): string {
  const existing = database.db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.videoId, videoId))
    .get();

  if (existing !== undefined) {
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
