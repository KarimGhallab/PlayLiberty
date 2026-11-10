import type { Dirent } from 'node:fs';
import { readdir, rm, stat } from 'node:fs/promises';
import { join, posix } from 'node:path';

import { isNotNull, lte, sql } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import { TrackFileStatus } from '@playliberty/contracts';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import type { TrackRow } from '../../../platform/database/schema.js';
import {
  accessTokens,
  associations,
  playlists,
  refreshFamilies,
  refreshTokens,
  tracks
} from '../../../platform/database/schema.js';
import type { MediaPaths } from '../../../platform/media/mediaPaths.js';
import { COVERS_DIRECTORY } from '../../../platform/media/mediaPaths.js';
import { removeOrphanTrack } from '../../tracks/trackLifecycle/trackLifecycle.js';

export interface PruneOptions {
  database: DatabaseHandle;
  mediaPaths: MediaPaths;
  logger: FastifyBaseLogger;
  signal?: AbortSignal;
}

export interface CredentialPruneOptions {
  database: DatabaseHandle;
  logger: FastifyBaseLogger;
  /* The credential clock; a test moves it to reach expiry. */
  now?: () => number;
}

export interface CredentialPruneSummary {
  readonly families: number;
  readonly refreshTokens: number;
  readonly accessTokens: number;
}

/* Expiry, not revocation: a revoked family is already unusable, but its row is
 * removed by the same cap that bounds every family. Tokens go first, so the
 * counts are their own rows rather than the family cascade. */
export function pruneExpiredCredentials(
  options: CredentialPruneOptions
): CredentialPruneSummary {
  const expiredAt = new Date((options.now ?? Date.now)()).toISOString();

  const summary = options.database.unitOfWork(() => {
    const refreshTokensRemoved = options.database.db
      .delete(refreshTokens)
      .where(lte(refreshTokens.expiresAt, expiredAt))
      .run().changes;
    const accessTokensRemoved = options.database.db
      .delete(accessTokens)
      .where(lte(accessTokens.expiresAt, expiredAt))
      .run().changes;
    const familiesRemoved = options.database.db
      .delete(refreshFamilies)
      .where(lte(refreshFamilies.expiresAt, expiredAt))
      .run().changes;

    return {
      families: familiesRemoved,
      refreshTokens: refreshTokensRemoved,
      accessTokens: accessTokensRemoved
    };
  });

  options.logger.info({ ...summary }, 'credential prune finished');

  return summary;
}

/* An orphan is a track with zero associations and nothing else, so a removed
 * held track is never a candidate. The row is deleted first, conditionally, and
 * its media only then. */
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

    // The conditional delete re-checks the orphan state, so an association
    // added after the scan keeps the track and its media.
    const deleted = removeOrphanTrack(options.database, track.id);

    if (!deleted) {
      continue;
    }

    await removeTrackMedia(options, track);
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

/* The audio and thumbnail, once the row is gone. A removal that fails is logged
 * and left: the row is already deleted, so nothing points at a missing file. */
async function removeTrackMedia(
  options: PruneOptions,
  track: TrackRow
): Promise<void> {
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
  } catch (error) {
    options.logger.warn(
      { trackId: track.id, err: error },
      'orphan prune could not remove media'
    );
  }
}
