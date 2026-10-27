import type { Track } from '@playliberty/contracts';

import type { Refusal } from '../../shared/refusal.js';

export enum TrackStreamOutcome {
  Ok = 'ok',
  NotFound = 'not_found',
  Forbidden = 'forbidden',
  NotStored = 'not_stored'
}

export type TrackStreamResult =
  | { outcome: TrackStreamOutcome.Ok; filePath: string }
  | { outcome: TrackStreamOutcome.NotFound; refusal: Refusal.TrackNotFound }
  | { outcome: TrackStreamOutcome.Forbidden; refusal: Refusal.Forbidden }
  | { outcome: TrackStreamOutcome.NotStored; refusal: Refusal.TrackNotStored };

export enum TrackThumbnailOutcome {
  Ok = 'ok',
  NotFound = 'not_found',
  Forbidden = 'forbidden'
}

export type TrackThumbnailResult =
  | { outcome: TrackThumbnailOutcome.Ok; thumbnailPath: string }
  | {
      outcome: TrackThumbnailOutcome.NotFound;
      refusal: Refusal.ThumbnailNotFound;
    }
  | { outcome: TrackThumbnailOutcome.Forbidden; refusal: Refusal.Forbidden };

/* The fields a track is created from: the video id is the identity and dedup
 * key, so a held track is never created twice. */
export interface TrackSeed {
  videoId: string;
  title: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  skipNonMusic: boolean;
}

export enum RetryTrackOutcome {
  Ok = 'ok',
  NotFound = 'not_found',
  NotRetryable = 'not_retryable'
}

export type RetryTrackResult =
  | { outcome: RetryTrackOutcome.Ok; track: Track }
  | { outcome: RetryTrackOutcome.NotFound; refusal: Refusal.TrackNotFound }
  | {
      outcome: RetryTrackOutcome.NotRetryable;
      refusal: Refusal.TrackNotRetryable;
    };

/* `NotEligible` covers every state the bypass cannot act on: stored is shared,
 * downloading is already fetching, unavailable is gone. */
export enum FetchWholeOutcome {
  Ok = 'ok',
  NotFound = 'not_found',
  NotEligible = 'not_eligible'
}

export type FetchWholeResult =
  | { outcome: FetchWholeOutcome.Ok; track: Track }
  | { outcome: FetchWholeOutcome.NotFound; refusal: Refusal.TrackNotFound }
  | {
      outcome: FetchWholeOutcome.NotEligible;
      refusal: Refusal.TrackNotFetchable;
    };
