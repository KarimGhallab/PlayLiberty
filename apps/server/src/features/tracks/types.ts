import type { Track } from '@playliberty/contracts';

export enum TrackStreamOutcome {
  Ok = 'ok',
  NotFound = 'not_found',
  Forbidden = 'forbidden',
  NotStored = 'not_stored'
}

export type TrackStreamResult =
  | { outcome: TrackStreamOutcome.Ok; filePath: string }
  | { outcome: TrackStreamOutcome.NotFound }
  | { outcome: TrackStreamOutcome.Forbidden }
  | { outcome: TrackStreamOutcome.NotStored };

export enum TrackThumbnailOutcome {
  Ok = 'ok',
  NotFound = 'not_found',
  Forbidden = 'forbidden'
}

export type TrackThumbnailResult =
  | { outcome: TrackThumbnailOutcome.Ok; thumbnailPath: string }
  | { outcome: TrackThumbnailOutcome.NotFound }
  | { outcome: TrackThumbnailOutcome.Forbidden };

/*
 * The fields a track is created from, before any file exists. The video id is the
 * identity and the dedup key; the rest is metadata the source supplied. A track
 * already held for the same id is never created a second time.
 */
export interface TrackSeed {
  videoId: string;
  title: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
}

export enum RetryTrackOutcome {
  Ok = 'ok',
  NotFound = 'not_found',
  NotRetryable = 'not_retryable'
}

export type RetryTrackResult =
  | { outcome: RetryTrackOutcome.Ok; track: Track }
  | { outcome: RetryTrackOutcome.NotFound }
  | { outcome: RetryTrackOutcome.NotRetryable };
