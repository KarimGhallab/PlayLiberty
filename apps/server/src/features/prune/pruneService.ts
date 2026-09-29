import type { FastifyBaseLogger } from 'fastify';

import type { DatabaseHandle } from '../../platform/database/client.js';
import type { MediaPaths } from '../../platform/media/mediaPaths.js';

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

  // The count is logged here rather than by the scheduler because the scheduler
  // does not know what the number means. An operator watching a weekly reclaim
  // should see the same line they saw before the job was split in two.
  options.logger.info({ removed: 0 }, 'orphan prune finished');

  return 0;
}
