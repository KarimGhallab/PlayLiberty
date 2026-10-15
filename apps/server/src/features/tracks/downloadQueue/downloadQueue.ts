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
 * The download queue, and the one place a track joins it.
 *
 * The queue is the `pending` track rows, so joining it is a lifecycle transition,
 * and the worker that drains it is told when something joined. Those two facts
 * belong together: a producer is woken because it queued work, not because it
 * remembered to tell the worker, which is the line the batch add had dropped.
 *
 * The unit is the operation, not the track. A request that adds one track, a
 * retry, a whole-fetch and a whole reconcile each open a queue, move tracks
 * through it, and are woken once at the end if any move queued work. One wake per
 * operation matters because the worker claims a batch per tick: a wake per track
 * would start passes that find the same backlog, and the sync would wake twice for
 * a two-video source.
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
