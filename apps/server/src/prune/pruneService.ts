import type { FastifyBaseLogger } from 'fastify';

import type { DatabaseHandle } from '../db/client.js';
import type { MediaPaths } from '../media/mediaPaths.js';

export interface PruneOptions {
  database: DatabaseHandle;
  mediaPaths: MediaPaths;
  logger: FastifyBaseLogger;
}

export async function pruneOrphanTracks(
  options: PruneOptions
): Promise<number> {
  // The prune logic is a later ticket (task 04 excludes it). This stub keeps the
  // scheduler wired and reports how many orphan tracks were removed.
  options.logger.debug(
    { mediaRoot: options.mediaPaths.root },
    'orphan prune tick (not implemented)'
  );
  return 0;
}
