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

/*
 * The track a video id already has, if any. A track is instance-wide and keyed by
 * video id, so this is the dedup read both the sync and the batch add make before
 * they create one, and its caller decides what to do with a track that exists:
 * the sync re-queues a failed one, the batch add reuses it untouched.
 */
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

/*
 * The stored row carries two fields the contract does not: the media path the
 * stream route resolves, and the thumbnail URL the download wrote. Neither is
 * metadata, so neither crosses the wire; the artwork is reached through the
 * track's own route.
 */
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

/*
 * Putting a failed track back in the queue without running a sync. The right
 * follows the track rather than the playlist, because the track is instance-wide
 * and a household shares one copy, so anyone who can write a playlist that holds
 * it may retry it. Only a failed track is retryable: a stored one has its audio, a
 * pending or downloading one is already queued, and unavailable is terminal. A
 * missing track and one no writable playlist holds are the same not-found, so the
 * route confirms nothing it will not act on. No run is created and no sync starts.
 */
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

/*
 * Forcing one track to be fetched whole. The bypass exists for a track whose
 * SponsorBlock lookup failed, or one the listener knows should stay whole, and it
 * is offered only when there is no stored file: a stored file is shared by every
 * association, so overwriting it would change every other playlist that references
 * the video. Healing an already-stored track is an operator action on the media
 * object, not a per-listener one.
 *
 * It flips the recorded policy to false and returns the track to `pending`, so the
 * next pass fetches it without the cut. The right follows the track the way retry
 * does: the owner of a playlist that holds it or a write collaborator on one, and
 * a read collaborator, a stranger, an orphan and a missing track are one
 * not-found.
 */
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
        /*
         * The eligibility rule lives in the lifecycle: a stored track has a file to
         * protect, a downloading one is mid-fetch and moving it would race the
         * worker, and an unavailable one is gone. The module refuses all three.
         */
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
