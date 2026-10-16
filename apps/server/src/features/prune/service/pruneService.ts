import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { sql } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import { TrackFileStatus } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import type { TrackRow } from '../../../platform/database/schema.js';
import { associations, tracks } from '../../../platform/database/schema.js';
import type { MediaPaths } from '../../../platform/media/mediaPaths.js';
import { removeTrack } from '../../tracks/trackLifecycle/trackLifecycle.js';

export interface PruneOptions {
  database: DatabaseHandle;
  mediaPaths: MediaPaths;
  logger: FastifyBaseLogger;
  signal?: AbortSignal;
}

/* An orphan is a track with zero associations and nothing else, so a removed
 * held track is never a candidate. Its media is removed before its row.
 */
export async function pruneOrphanTracks(
  options: PruneOptions
): Promise<number> {
  const orphans = options.database.db
    .select()
    .from(tracks)
    .where(
      sql`not exists (
        select 1 from ${associations}
        where ${associations.trackId} = ${tracks.id}
      )`
    )
    .all();

  let removed = 0;

  for (const track of orphans) {
    // Deleting a downloading row mid-write leaves a file with no row; skip it.
    if (track.fileStatus === TrackFileStatus.Downloading) {
      continue;
    }

    // Abort check is between tracks, not mid-deletion, so nothing is orphaned.
    if (options.signal?.aborted === true) {
      options.logger.info({ removed }, 'orphan prune stopped before finishing');
      break;
    }

    const gone = await removeTrackMedia(options, track);

    if (!gone) {
      continue;
    }

    removeTrack(options.database, track.id);
    removed += 1;
  }

  // Logged here, not by the scheduler: one line whether quiet or a fault.
  options.logger.info({ removed }, 'orphan prune finished');

  return removed;
}

/* The audio and thumbnail, or false if either could not go. The row is removed
 * only once both are gone, so a later run can finish a failed removal. */
async function removeTrackMedia(
  options: PruneOptions,
  track: TrackRow
): Promise<boolean> {
  const paths: string[] = [];

  if (track.filePath !== null) {
    paths.push(join(options.mediaPaths.root, track.filePath));
  }

  if (track.thumbnailPath !== null) {
    paths.push(join(options.mediaPaths.root, track.thumbnailPath));
  }

  try {
    for (const path of paths) {
      // force, because a file already gone is the state wanted, not an error.
      await rm(path, { force: true });
    }

    return true;
  } catch (error) {
    options.logger.warn(
      { trackId: track.id, err: error },
      'orphan prune could not remove media'
    );

    return false;
  }
}
