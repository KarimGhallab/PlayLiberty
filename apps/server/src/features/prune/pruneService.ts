import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { eq, sql } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import { TrackFileStatus } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { associations, tracks } from '../../platform/database/schema.js';
import type { TrackRow } from '../../platform/database/schema.js';
import type { MediaPaths } from '../../platform/media/mediaPaths.js';

export interface PruneOptions {
  database: DatabaseHandle;
  mediaPaths: MediaPaths;
  logger: FastifyBaseLogger;
}

/*
 * Reclaiming the media of tracks no playlist holds any more.
 *
 * An orphan is a track with zero associations and nothing else. It is not an
 * orphan because its download failed, because its source video is gone, or because
 * its playlist was deleted this week: only the absence of any association makes it
 * one, which is why a remote-removed track still in a playlist is never a
 * candidate and the retention promise is permanent rather than weekly.
 *
 * The media goes before the row, in one transaction per track. Deleting the row
 * first would leave a file with nothing to find it by, and no later run could
 * reclaim it, because both this and the startup sweep start from rows. Removing
 * the file first and failing afterwards leaves a row claiming a file that is not
 * there, which a stream request would surface as a broken track, so a track whose
 * media cannot be removed is skipped and left for the next run with its row intact.
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
    // The worker holds a file it is writing, so deleting its row mid-download
    // produces a file with no row, which is the state the ordering above exists to
    // prevent. It is left for a later run.
    if (track.fileStatus === TrackFileStatus.Downloading) {
      continue;
    }

    const gone = await removeTrackMedia(options, track);

    if (!gone) {
      continue;
    }

    options.database.db.delete(tracks).where(eq(tracks.id, track.id)).run();
    removed += 1;
  }

  // The count is logged here rather than by the scheduler because the scheduler
  // does not know what the number means. A healthy instance should not have to
  // distinguish a quiet week from a fault, so this is the same line either way.
  options.logger.info({ removed }, 'orphan prune finished');

  return removed;
}

/*
 * The audio and the thumbnail of one track, or false if either could not go. The
 * row is only removed once both are gone, so a failure leaves a track that a later
 * run can finish rather than an orphan on disk with no row to find it by.
 */
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
      // force, because a file already gone is the state this wants, not an error.
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
