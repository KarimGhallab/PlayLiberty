import type { FastifyBaseLogger } from 'fastify';

import type { AppContext } from '../../shared/context.js';

import type { JobHandle } from '../../platform/jobs/intervalJob.js';
import { startIntervalJob } from '../../platform/jobs/intervalJob.js';

/*
 * The slot that processes pending tracks. The queue is the `track` rows themselves,
 * so there is no jobs table and nothing to enqueue: a row with
 * `fileStatus: pending` is the work, and this is the one thing in the process that
 * acts on it.
 *
 * The worker is stoppable because the server has to shut down cleanly, and a
 * download interrupted mid-flight leaves a temporary file and a row still claiming
 * to be downloading, which is what the startup sweep undoes on the next boot.
 * The interval is the platform's, because unref'ing a timer and clearing it on
 * stop is not this feature's business. What a tick does is.
 */
export interface DownloadWorkerOptions {
  context: AppContext;
  logger: FastifyBaseLogger;
}

export type DownloadWorkerHandle = JobHandle;

export function startDownloadWorker(
  options: DownloadWorkerOptions
): DownloadWorkerHandle {
  // Claiming pending tracks and calling the adapter is a later ticket. Until then
  // this keeps a single, stoppable owner of the worker slot, so the wiring is real
  // and the seam the download will use is already in place.
  return startIntervalJob({
    intervalMs: 30_000,
    tick: (): void => {
      options.logger.debug(
        { mediaRoot: options.context.mediaPaths.root },
        'download worker idle'
      );
    }
  });
}
