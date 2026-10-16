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

/* Only the columns the lifecycle owns, so a transition cannot set another. */
type TrackStateFields = Partial<{
  fileStatus: TrackFileStatus;
  sourceStatus: TrackSourceStatus;
  failureReason: string | null;
  filePath: string | null;
  durationSeconds: number | null;
  skipNonMusic: boolean;
  thumbnailPath: string | null;
}>;

/* The single transition shape: the conditional write is the guard, so a row in
 * another state is untouched, and the read only names the refusal. */
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

/* Provider fixed: YouTube is the only source. The video id is the key. */
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
 * Moves the oldest `pending` rows to the cap to `downloading`, returning what
 * it moved, so no download starts twice. The two statements are the guard.
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

export function retryTrack(
  database: DatabaseHandle,
  trackId: string
): TrackTransitionResult {
  return applyTransition(database, trackId, [TrackFileStatus.Failed], {
    fileStatus: TrackFileStatus.Pending,
    failureReason: null
  });
}

/* Fetch-whole: a pending or failed track requeued with the policy off. A stored
 * track is ineligible, because its file is shared across every association. */
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

/* Gone is not a failure: the track is kept and marked removed; only one with no
 * stored file becomes unavailable. */
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

/* An interrupted download's `downloading` row returns to `pending`; the batch
 * update is the guard, moving only `downloading` rows. */
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

/* Best effort: a track with no thumbnail path is still playable. */
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

/* The caller removes the media first, calling this only on success: a row never
 * points at a file that is not there. */
export function removeTrack(database: DatabaseHandle, trackId: string): void {
  database.db.delete(tracks).where(eq(tracks.id, trackId)).run();
}
