import type { Dirent } from 'node:fs';
import { readdir, rm, stat } from 'node:fs/promises';
import { join, posix } from 'node:path';

import { isNotNull, sql } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import { TrackFileStatus } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import type { TrackRow } from '../../../platform/database/schema.js';
import {
  associations,
  playlists,
  tracks
} from '../../../platform/database/schema.js';
import type { MediaPaths } from '../../../platform/media/mediaPaths.js';
import { COVERS_DIRECTORY } from '../../../platform/media/mediaPaths.js';
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

/* One hour: an upload writes its file before the row commits, and a sweep
 * inside that gap would delete a cover the row is about to name. */
const COVER_GRACE_MS = 60 * 60 * 1000;

/*
 * A cover path is referenced by the one playlist row that names it. The sweep
 * reads the references first, and the grace window covers an upload that wrote
 * its file before the row commits.
 */
export async function pruneOrphanCovers(
  options: PruneOptions
): Promise<number> {
  const referenced = new Set(
    options.database.db
      .select({ coverPath: playlists.coverPath })
      .from(playlists)
      .where(isNotNull(playlists.coverPath))
      .all()
      .flatMap(row => (row.coverPath === null ? [] : [row.coverPath]))
  );

  let entries: Dirent[];

  try {
    entries = await readdir(options.mediaPaths.coversDir, {
      withFileTypes: true
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      options.logger.info({ removed: 0 }, 'cover prune finished');
      return 0;
    }

    options.logger.warn(
      { err: error },
      'cover prune could not read the covers directory'
    );

    return 0;
  }

  let removed = 0;
  const now = Date.now();

  for (const entry of entries) {
    // Only files; a directory in the covers root is not a cover.
    if (!entry.isFile()) {
      continue;
    }

    if (options.signal?.aborted === true) {
      options.logger.info({ removed }, 'cover prune stopped before finishing');
      break;
    }

    if (referenced.has(posix.join(COVERS_DIRECTORY, entry.name))) {
      continue;
    }

    const absolutePath = join(options.mediaPaths.coversDir, entry.name);
    const file = await stat(absolutePath).catch(() => null);

    if (file === null || now - file.mtimeMs <= COVER_GRACE_MS) {
      continue;
    }

    try {
      await rm(absolutePath, { force: true });
      removed += 1;
    } catch (error) {
      options.logger.warn(
        { path: absolutePath, err: error },
        'cover prune could not remove a file'
      );
    }
  }

  options.logger.info({ removed }, 'cover prune finished');

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
