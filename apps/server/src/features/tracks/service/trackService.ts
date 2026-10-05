import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import type { Track } from '@playliberty/contracts';
import {
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import {
  canAccountAccessTrack,
  canAccountWriteTrack
} from '../../../shared/access/trackAccess.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import type { TrackRow } from '../../../platform/database/schema.js';
import { tracks } from '../../../platform/database/schema.js';
import type {
  FetchWholeResult,
  RetryTrackResult,
  TrackSeed,
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

  if (!canAccountAccessTrack(database, track.id, accountId)) {
    return { outcome: TrackStreamOutcome.Forbidden };
  }

  if (track.fileStatus !== TrackFileStatus.Stored || track.filePath === null) {
    return { outcome: TrackStreamOutcome.NotStored };
  }

  return { outcome: TrackStreamOutcome.Ok, filePath: track.filePath };
}

export function resolveTrackForThumbnail(
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): TrackThumbnailResult {
  const track = loadTrack(database, trackId);

  if (track === undefined || track.thumbnailPath === null) {
    return { outcome: TrackThumbnailOutcome.NotFound };
  }

  if (!canAccountAccessTrack(database, track.id, accountId)) {
    return { outcome: TrackThumbnailOutcome.Forbidden };
  }

  return {
    outcome: TrackThumbnailOutcome.Ok,
    thumbnailPath: track.thumbnailPath
  };
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
 * One track for a video id the instance does not hold yet, queued for download.
 * The provider is fixed today because YouTube is the only source; the video id is
 * the key every later read uses.
 */
export function createPendingTrack(
  database: DatabaseHandle,
  seed: TrackSeed
): string {
  const trackId = randomUUID();

  database.db
    .insert(tracks)
    .values({
      id: trackId,
      provider: Provider.Youtube,
      videoId: seed.videoId,
      title: seed.title,
      durationSeconds: seed.durationSeconds,
      skipNonMusic: seed.skipNonMusic,
      thumbnailPath: null,
      thumbnailUrl: seed.thumbnailUrl,
      fileStatus: TrackFileStatus.Pending,
      sourceStatus: TrackSourceStatus.Available,
      filePath: null,
      failureReason: null
    })
    .run();

  return trackId;
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
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): RetryTrackResult {
  const track = loadTrack(database, trackId);

  if (
    track === undefined ||
    !canAccountWriteTrack(database, track.id, accountId)
  ) {
    return { outcome: RetryTrackOutcome.NotFound };
  }

  if (track.fileStatus !== TrackFileStatus.Failed) {
    return { outcome: RetryTrackOutcome.NotRetryable };
  }

  const updatedAt = new Date().toISOString();
  const trackUpdatedFields: Partial<Track> = {
    fileStatus: TrackFileStatus.Pending,
    failureReason: null,
    updatedAt
  };

  const updated = database.db
    .update(tracks)
    .set(trackUpdatedFields)
    .where(eq(tracks.id, track.id))
    .run();

  // Success is claimed from the write itself: if it changed no row, the track is
  // not there, which is the same answer as one that was never there.
  if (updated.changes === 0) {
    return { outcome: RetryTrackOutcome.NotFound };
  }

  // The row already in hand is the answer with the three fields this write
  // changed applied; a second read would only fetch back what was just written.
  return {
    outcome: RetryTrackOutcome.Ok,
    track: toTrackView({
      ...track,
      ...trackUpdatedFields
    })
  };
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
  database: DatabaseHandle,
  trackId: string,
  accountId: string
): FetchWholeResult {
  const track = loadTrack(database, trackId);

  if (
    track === undefined ||
    !canAccountWriteTrack(database, track.id, accountId)
  ) {
    return { outcome: FetchWholeOutcome.NotFound };
  }

  // Only a track waiting to be fetched is eligible. A stored one has a file to
  // protect, a downloading one is mid-fetch and moving it would race the worker,
  // and an unavailable one is gone.
  if (
    track.fileStatus !== TrackFileStatus.Pending &&
    track.fileStatus !== TrackFileStatus.Failed
  ) {
    return { outcome: FetchWholeOutcome.NotEligible };
  }

  const updatedAt = new Date().toISOString();
  const trackUpdatedFields: Partial<Track> = {
    skipNonMusic: false,
    fileStatus: TrackFileStatus.Pending,
    failureReason: null,
    updatedAt
  };

  const updated = database.db
    .update(tracks)
    .set(trackUpdatedFields)
    .where(eq(tracks.id, track.id))
    .run();

  if (updated.changes === 0) {
    return { outcome: FetchWholeOutcome.NotFound };
  }

  return {
    outcome: FetchWholeOutcome.Ok,
    track: toTrackView({
      ...track,
      ...trackUpdatedFields
    })
  };
}
