import type { FastifyBaseLogger } from 'fastify';

import type { Config } from '../config/types.js';
import type { DatabaseHandle } from '../db/client.js';

export interface DownloadWorkerHandle {
  stop(): Promise<void>;
}

export interface DownloadWorkerOptions {
  database: DatabaseHandle;
  config: Config;
  logger: FastifyBaseLogger;
}

export function startDownloadWorker(
  options: DownloadWorkerOptions
): DownloadWorkerHandle {
  // The queue is the `track` rows themselves. Processing them is a later ticket;
  // this keeps a single, stoppable owner of the worker slot so the wiring is real.
  const timer = setInterval(() => {
    options.logger.debug(
      { mediaRoot: options.config.mediaRoot },
      'download worker idle'
    );
  }, 30_000);
  timer.unref();

  return {
    stop: async (): Promise<void> => {
      clearInterval(timer);
    }
  };
}
