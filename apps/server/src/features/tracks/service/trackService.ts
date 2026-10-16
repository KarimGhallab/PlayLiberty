import { eq } from 'drizzle-orm';

import type { Track } from '@playliberty/contracts';
import { TrackFileStatus } from '@playliberty/contracts';

import {
  AccessNeed,
  EntryOutcome,
  trackEntry
} from '../../../shared/access/entry.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import type { TrackRow } from '../../../platform/database/schema.js';
import { tracks } from '../../../platform/database/schema.js';
import { withDownloadQueue } from '../downloadQueue/downloadQueue.js';
import type { DownloadQueueContext } from '../downloadQueue/downloadQueue.js';
import { TrackTransitionOutcome } from '../trackLifecycle/trackLifecycle.js';
import type {
  FetchWholeResult,
  RetryTrackResult,
  TrackStreamResult,
  TrackThumbnailResult
} from '../types.js';
import {
  FetchWholeOutcome,
  RetryTrackOutcome,
  TrackStreamOutcome,
  TrackThumbnailOutcome
} from '../types.js';

function loadTrack(
  database: DatabaseHandle,
  trackId: string
): TrackRow | undefined {
  return database.db.select().from(tracks).where(eq(tracks.id, trackId)).get();
}

export function resolveTrackForStream(
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): TrackStreamResult {
  const track = loadTrack(database, trackId);

  if (track === undefined) {
    return { outcome: TrackStreamOutcome.NotFound };
  }

  const entry = trackEntry<TrackStreamResult>(
    database,
    track.id,
    accountId,
    AccessNeed.Read,
    () => {
      if (
        track.fileStatus !== TrackFileStatus.Stored ||
        track.filePath === null
      ) {
        return { outcome: TrackStreamOutcome.NotStored };
      }

      return { outcome: TrackStreamOutcome.Ok, filePath: track.filePath };
    }
  );

  if (entry.outcome === EntryOutcome.Denied) {
    return { outcome: TrackStreamOutcome.Forbidden };
  }

  return entry.value;
}

export function resolveTrackForThumbnail(
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): TrackThumbnailResult {
  const track = loadTrack(database, trackId);

  if (track === undefined) {
    return { outcome: TrackThumbnailOutcome.NotFound };
  }

  const thumbnailPath = track.thumbnailPath;

  if (thumbnailPath === null) {
    return { outcome: TrackThumbnailOutcome.NotFound };
  }

  const entry = trackEntry<TrackThumbnailResult>(
    database,
    track.id,
    accountId,
    AccessNeed.Read,
    () => ({
      outcome: TrackThumbnailOutcome.Ok,
      thumbnailPath
    })
  );

  if (entry.outcome === EntryOutcome.Denied) {
    return { outcome: TrackThumbnailOutcome.Forbidden };
  }

  return entry.value;
}

/* The dedup read: a track is keyed by video id, so sync and batch add call it
 * before creating one. */
export function findTrackByVideoId(
  database: DatabaseHandle,
  videoId: string
): Pick<TrackRow, 'id' | 'fileStatus'> | undefined {
  return database.db
    .select({ id: tracks.id, fileStatus: tracks.fileStatus })
    .from(tracks)
    .where(eq(tracks.videoId, videoId))
    .get();
}

/* Media path and thumbnail URL stay off the wire; artwork is reached through
 * the track's own route. */
export function toTrackView(row: TrackRow): Track {
  return {
    id: row.id,
    provider: row.provider,
    videoId: row.videoId,
    title: row.title,
    durationSeconds: row.durationSeconds,
    skipNonMusic: row.skipNonMusic,
    thumbnailPath: row.thumbnailPath,
    fileStatus: row.fileStatus,
    sourceStatus: row.sourceStatus,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

/* Retry a failed track without a sync. The right follows the track, so write
 * access to a holding playlist may retry it; absent reads as not-found. */
export function retryTrackForAccount(
  context: DownloadQueueContext,
  trackId: string,
  accountId: string
): RetryTrackResult {
  const track = loadTrack(context.database, trackId);

  if (track === undefined) {
    return { outcome: RetryTrackOutcome.NotFound };
  }

  const entry = trackEntry<RetryTrackResult>(
    context.database,
    track.id,
    accountId,
    AccessNeed.Write,
    () =>
      withDownloadQueue<RetryTrackResult>(context, queue => {
        const transition = queue.retry(track.id);

        if (transition.outcome === TrackTransitionOutcome.Refused) {
          return { outcome: RetryTrackOutcome.NotRetryable };
        }

        if (transition.outcome === TrackTransitionOutcome.Missing) {
          return { outcome: RetryTrackOutcome.NotFound };
        }

        return {
          outcome: RetryTrackOutcome.Ok,
          track: toTrackView(transition.track)
        };
      })
  );

  if (entry.outcome === EntryOutcome.Denied) {
    return { outcome: RetryTrackOutcome.NotFound };
  }

  return entry.value;
}

/* Fetch a track whole, only when no stored file exists: the file is shared
 * across every association, so overwriting it would change every playlist. */
export function fetchTrackWholeForAccount(
  context: DownloadQueueContext,
  trackId: string,
  accountId: string
): FetchWholeResult {
  const track = loadTrack(context.database, trackId);

  if (track === undefined) {
    return { outcome: FetchWholeOutcome.NotFound };
  }

  const entry = trackEntry<FetchWholeResult>(
    context.database,
    track.id,
    accountId,
    AccessNeed.Write,
    () =>
      withDownloadQueue<FetchWholeResult>(context, queue => {
        /* Eligibility lives in the lifecycle: stored has a file, downloading
         * would race the worker, unavailable is gone. */
        const transition = queue.fetchWhole(track.id);

        if (transition.outcome === TrackTransitionOutcome.Refused) {
          return { outcome: FetchWholeOutcome.NotEligible };
        }

        if (transition.outcome === TrackTransitionOutcome.Missing) {
          return { outcome: FetchWholeOutcome.NotFound };
        }

        return {
          outcome: FetchWholeOutcome.Ok,
          track: toTrackView(transition.track)
        };
      })
  );

  if (entry.outcome === EntryOutcome.Denied) {
    return { outcome: FetchWholeOutcome.NotFound };
  }

  return entry.value;
}
