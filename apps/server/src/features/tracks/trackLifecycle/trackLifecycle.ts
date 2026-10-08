import { randomUUID } from 'node:crypto';

import { and, eq, inArray, sql } from 'drizzle-orm';

import {
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import type { TrackRow } from '../../../platform/database/schema.js';
import { tracks } from '../../../platform/database/schema.js';
import type { TrackSeed } from '../types.js';

export enum TrackTransitionOutcome {
  Applied = 'applied',
  Refused = 'refused',
  Missing = 'missing'
}

export type TrackTransitionResult =
  | { outcome: TrackTransitionOutcome.Applied; track: TrackRow }
  | { outcome: TrackTransitionOutcome.Refused }
  | { outcome: TrackTransitionOutcome.Missing };

export interface StoreTrackInput {
  filePath: string;
  durationSeconds: number | null;
}

/*
 * The state fields a transition writes. Kept to the columns the lifecycle owns
 * so a transition cannot reach for a field it has no business setting.
 */
type TrackStateFields = Partial<{
  fileStatus: TrackFileStatus;
  sourceStatus: TrackSourceStatus;
  failureReason: string | null;
  filePath: string | null;
  durationSeconds: number | null;
  skipNonMusic: boolean;
  thumbnailPath: string | null;
}>;

/*
 * The one shape a single-track transition takes: move the row only while it is
 * in a state the move leaves, and hand back the row as written. The conditional
 * write is the guard, so a row in any other state is left exactly as it is; the
 * read afterwards only says which of the two refusals happened.
 */
function applyTransition(
  database: DatabaseHandle,
  trackId: string,
  from: TrackFileStatus[],
  set: TrackStateFields
): TrackTransitionResult {
  const updated = database.db
    .update(tracks)
    .set({ ...set, updatedAt: new Date().toISOString() })
    .where(and(eq(tracks.id, trackId), inArray(tracks.fileStatus, from)))
    .returning()
    .get();

  if (updated !== undefined) {
    return { outcome: TrackTransitionOutcome.Applied, track: updated };
  }

  const exists = database.db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .get();

  return exists === undefined
    ? { outcome: TrackTransitionOutcome.Missing }
    : { outcome: TrackTransitionOutcome.Refused };
}

/*
 * One track for a video id the instance does not hold yet, queued for download.
 * The provider is fixed today because YouTube is the only source; the video id is
 * the key every later read uses. This is the lifecycle's birth: a track starts
 * `pending` with an available source and no file.
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
 * The claim: the oldest `pending` rows up to the cap, moved to `downloading` only
 * if they are still `pending`, returning exactly the ones it moved. A row another
 * pass already took is not in the result, so no download is started twice. The
 * two statements are the guard: the second moves only what the first selected and
 * only while it is still pending.
 */
export function claimPendingTracks(
  database: DatabaseHandle,
  limit: number
): TrackRow[] {
  const batch = Math.max(1, Math.floor(limit));

  const candidates = database.db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.fileStatus, TrackFileStatus.Pending))
    .orderBy(sql`${tracks}.rowid`)
    .limit(batch)
    .all();

  if (candidates.length === 0) {
    return [];
  }

  return database.db
    .update(tracks)
    .set({
      fileStatus: TrackFileStatus.Downloading,
      updatedAt: new Date().toISOString()
    })
    .where(
      and(
        eq(tracks.fileStatus, TrackFileStatus.Pending),
        inArray(
          tracks.id,
          candidates.map(candidate => candidate.id)
        )
      )
    )
    .returning()
    .all();
}

/* The store: a claimed download that finished, with the file the adapter wrote. */
export function storeTrack(
  database: DatabaseHandle,
  trackId: string,
  input: StoreTrackInput
): TrackTransitionResult {
  return applyTransition(database, trackId, [TrackFileStatus.Downloading], {
    fileStatus: TrackFileStatus.Stored,
    filePath: input.filePath,
    durationSeconds: input.durationSeconds,
    failureReason: null
  });
}

/* The failure: a claimed download that failed for a reason worth keeping. */
export function failTrack(
  database: DatabaseHandle,
  trackId: string,
  reason: string
): TrackTransitionResult {
  return applyTransition(database, trackId, [TrackFileStatus.Downloading], {
    fileStatus: TrackFileStatus.Failed,
    failureReason: reason
  });
}

/* The retry: a failed track back in the queue, with its stale reason cleared. */
export function retryTrack(
  database: DatabaseHandle,
  trackId: string
): TrackTransitionResult {
  return applyTransition(database, trackId, [TrackFileStatus.Failed], {
    fileStatus: TrackFileStatus.Pending,
    failureReason: null
  });
}

/*
 * The fetch-whole: a pending or failed track back in the queue with the policy
 * turned off, so the next pass fetches it without the cut. A stored track is not
 * eligible, because its file is shared by every association and re-cutting it
 * would change every playlist that references the video.
 */
export function fetchTrackWhole(
  database: DatabaseHandle,
  trackId: string
): TrackTransitionResult {
  return applyTransition(
    database,
    trackId,
    [TrackFileStatus.Pending, TrackFileStatus.Failed],
    {
      skipNonMusic: false,
      fileStatus: TrackFileStatus.Pending,
      failureReason: null
    }
  );
}

/*
 * A video that is gone from its source is not a failure: the track is kept and
 * marked removed, and only a track with no stored file becomes unavailable. The
 * module reads the file status itself, so the caller no longer decides whether
 * the file is kept. A track already marked removed is left alone.
 */
export function markTrackSourceRemoved(
  database: DatabaseHandle,
  trackId: string
): TrackTransitionResult {
  const row = database.db
    .select()
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .get();

  if (row === undefined) {
    return { outcome: TrackTransitionOutcome.Missing };
  }

  if (row.sourceStatus === TrackSourceStatus.Removed) {
    return { outcome: TrackTransitionOutcome.Refused };
  }

  const updated = database.db
    .update(tracks)
    .set({
      sourceStatus: TrackSourceStatus.Removed,
      ...(row.fileStatus === TrackFileStatus.Stored
        ? {}
        : { fileStatus: TrackFileStatus.Unavailable }),
      updatedAt: new Date().toISOString()
    })
    .where(eq(tracks.id, trackId))
    .returning()
    .get();

  if (updated === undefined) {
    return { outcome: TrackTransitionOutcome.Missing };
  }

  return { outcome: TrackTransitionOutcome.Applied, track: updated };
}

/*
 * The startup sweep's reset: a download interrupted by a crash leaves a row still
 * claiming to be downloading, so every such row returns to `pending` and is
 * claimed again. The batch update is the guard: only `downloading` rows move.
 */
export function resetDownloadingTracks(database: DatabaseHandle): number {
  const result = database.db
    .update(tracks)
    .set({
      fileStatus: TrackFileStatus.Pending,
      updatedAt: new Date().toISOString()
    })
    .where(eq(tracks.fileStatus, TrackFileStatus.Downloading))
    .run();

  return result.changes;
}

/*
 * The artwork, written after the audio is stored. It is best effort: a track with
 * no thumbnail path is stored and playable, and the path is reached through the
 * track's own route.
 */
export function storeThumbnail(
  database: DatabaseHandle,
  trackId: string,
  thumbnailPath: string
): void {
  database.db
    .update(tracks)
    .set({ thumbnailPath, updatedAt: new Date().toISOString() })
    .where(eq(tracks.id, trackId))
    .run();
}

/*
 * The death: an orphan track's row is removed once its media is gone. The caller
 * removes the media first and only calls this when that succeeded, so a row never
 * points at a file that is not there.
 */
export function removeTrack(database: DatabaseHandle, trackId: string): void {
  database.db.delete(tracks).where(eq(tracks.id, trackId)).run();
}
