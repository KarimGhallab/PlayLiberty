import type { AppContext } from '../../../shared/context.js';

import type { TrackTransitionResult } from '../trackLifecycle/trackLifecycle.js';
import {
  TrackTransitionOutcome,
  createPendingTrack,
  fetchTrackWhole,
  retryTrack
} from '../trackLifecycle/trackLifecycle.js';
import type { TrackSeed } from '../types.js';

/*
 * The download queue, and the one place a track joins it. The queue is the
 * `pending` rows, so joining is a lifecycle transition; the unit is the
 * operation, waking the worker once at the end, not once per track.
 */
export type DownloadQueueContext = Pick<
  AppContext,
  'database' | 'kickDownloads'
>;

export interface DownloadQueue {
  /** The queue always gains one. */
  create(seed: TrackSeed): string;
  /** Only an applied move queues work. */
  retry(trackId: string): TrackTransitionResult;
  fetchWhole(trackId: string): TrackTransitionResult;
}

export function withDownloadQueue<Result>(
  context: DownloadQueueContext,
  operation: (queue: DownloadQueue) => Result
): Result {
  let queued = false;

  const queue: DownloadQueue = {
    create: seed => {
      const trackId = createPendingTrack(context.database, seed);
      queued = true;
      return trackId;
    },
    retry: trackId => {
      const result = retryTrack(context.database, trackId);
      queued = queued || result.outcome === TrackTransitionOutcome.Applied;
      return result;
    },
    fetchWhole: trackId => {
      const result = fetchTrackWhole(context.database, trackId);
      queued = queued || result.outcome === TrackTransitionOutcome.Applied;
      return result;
    }
  };

  const result = operation(queue);

  if (queued) {
    context.kickDownloads();
  }

  return result;
}
