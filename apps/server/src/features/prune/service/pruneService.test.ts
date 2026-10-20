import { access, chmod, mkdir, utimes, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { eq } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { TrackFileStatus, TrackSourceStatus } from '@playliberty/contracts';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';
import {
  associate,
  seedAccount,
  seedPlaylist,
  seedTrack
} from '../../../app/testing/fixtures.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import {
  associations,
  suppressions,
  tracks
} from '../../../platform/database/schema.js';
import {
  mediaRelativePath,
  thumbnailRelativePath
} from '../../../platform/media/mediaPaths.js';
import { pruneOrphanCovers, pruneOrphanTracks } from './pruneService.js';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

function database(): DatabaseHandle {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database;
}

/* A spy logger, not a real pino: a test only needs which line, with what.
 * It satisfies the logger's shape by being cast at the call. */
function recordingLogger(): {
  logger: FastifyBaseLogger;
  warnings: Record<string, unknown>[];
  infos: Record<string, unknown>[];
} {
  const warnings: Record<string, unknown>[] = [];
  const infos: Record<string, unknown>[] = [];

  const logger = {
    info: (payload: Record<string, unknown>, message: string): void => {
      infos.push({ ...payload, message });
    },
    debug: (): void => undefined,
    warn: (payload: Record<string, unknown>): void => {
      warnings.push(payload);
    },
    error: (payload: Record<string, unknown>): void => {
      warnings.push(payload);
    },
    child: (): unknown => logger
  } as unknown as FastifyBaseLogger;

  return { logger, warnings, infos };
}

/* A logger whose first warning aborts the controller: the deterministic hook
 * for stopping a run mid-scan, not racing a timer against the run's speed. */
function abortsOnWarning(controller: AbortController): {
  logger: FastifyBaseLogger;
  warnings: Record<string, unknown>[];
} {
  const recording = recordingLogger();
  const logger = {
    info: (): void => undefined,
    debug: (): void => undefined,
    warn: (payload: Record<string, unknown>): void => {
      recording.warnings.push(payload);
      controller.abort();
    },
    error: (payload: Record<string, unknown>): void => {
      recording.warnings.push(payload);
      controller.abort();
    },
    child: (): unknown => logger
  } as unknown as FastifyBaseLogger;

  return { logger, warnings: recording.warnings };
}

async function writeBytes(relativePath: string): Promise<string> {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  const absolutePath = join(context.mediaPaths.root, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, 'the-media');

  return absolutePath;
}

/* A cover file, aged past the sweep's grace window when asked. */
async function writeCover(name: string, ageMs = 0): Promise<string> {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  const absolutePath = join(context.mediaPaths.coversDir, name);
  await writeFile(absolutePath, 'the-cover');

  if (ageMs > 0) {
    const when = new Date(Date.now() - ageMs);
    await utimes(absolutePath, when, when);
  }

  return absolutePath;
}

async function exists(absolutePath: string): Promise<boolean> {
  return access(absolutePath).then(
    () => true,
    () => false
  );
}

function trackRow(trackId: string) {
  return database()
    .db.select()
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .get();
}

function prune(logger: FastifyBaseLogger, signal?: AbortSignal) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return pruneOrphanTracks({
    database: context.database,
    mediaPaths: context.mediaPaths,
    logger,
    signal
  });
}

function pruneCovers(logger: FastifyBaseLogger, signal?: AbortSignal) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return pruneOrphanCovers({
    database: context.database,
    mediaPaths: context.mediaPaths,
    logger,
    signal
  });
}

describe('pruning orphaned tracks', () => {
  it('removes the row, the audio and the thumbnail of a track with no associations', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    const relativePath = mediaRelativePath('aaaaaaaaaaa', '.m4a');
    const thumbPath = thumbnailRelativePath('aaaaaaaaaaa');
    const { trackId } = seedTrack(database(), {
      filePath: relativePath,
      thumbnailPath: thumbPath
    });
    const audio = await writeBytes(relativePath);
    const thumbnail = await writeBytes(thumbPath);

    const removed = await prune(logger);

    expect(removed).toBe(1);
    expect(trackRow(trackId)).toBeUndefined();
    await expect(exists(audio)).resolves.toBe(false);
    await expect(exists(thumbnail)).resolves.toBe(false);
  });

  it.each([
    TrackFileStatus.Pending,
    TrackFileStatus.Stored,
    TrackFileStatus.Failed,
    TrackFileStatus.Unavailable
  ])(
    'leaves a track with one association alone, in the %s state',
    async fileStatus => {
      context = await createTestContext();
      const { logger } = recordingLogger();
      const relativePath = mediaRelativePath('aaaaaaaaaaa', '.m4a');
      const { trackId } = seedTrack(database(), {
        fileStatus,
        filePath: relativePath
      });
      const audio = await writeBytes(relativePath);
      associate(
        database(),
        seedPlaylist(database(), seedAccount(database()).accountId).playlistId,
        trackId
      );

      const removed = await prune(logger);

      expect(removed).toBe(0);
      expect(trackRow(trackId)?.fileStatus).toBe(fileStatus);
      await expect(exists(audio)).resolves.toBe(true);
    }
  );

  it('leaves a remote-removed stored track that is still in a playlist', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    const relativePath = mediaRelativePath('aaaaaaaaaaa', '.m4a');
    const { trackId } = seedTrack(database(), {
      fileStatus: TrackFileStatus.Stored,
      sourceStatus: TrackSourceStatus.Removed,
      filePath: relativePath
    });
    const audio = await writeBytes(relativePath);
    associate(
      database(),
      seedPlaylist(database(), seedAccount(database()).accountId).playlistId,
      trackId
    );

    const removed = await prune(logger);

    expect(removed).toBe(0);
    expect(trackRow(trackId)).toBeDefined();
    await expect(exists(audio)).resolves.toBe(true);
  });

  it('skips a downloading track and survives', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    const { trackId } = seedTrack(database(), {
      fileStatus: TrackFileStatus.Downloading
    });

    const removed = await prune(logger);

    expect(removed).toBe(0);
    expect(trackRow(trackId)?.fileStatus).toBe(TrackFileStatus.Downloading);
  });

  it('keeps the row when the media cannot be removed, and removes it on a later run once gone', async () => {
    context = await createTestContext();
    const { logger, warnings } = recordingLogger();
    const relativePath = mediaRelativePath('aaaaaaaaaaa', '.m4a');
    const { trackId } = seedTrack(database(), { filePath: relativePath });
    const audio = await writeBytes(relativePath);

    // The parent directory is read-only, so the file cannot be unlinked while
    // it stays readable to the process.
    await chmod(dirname(audio), 0o500);

    const firstRun = await prune(logger);

    expect(firstRun).toBe(0);
    expect(trackRow(trackId)).toBeDefined();
    expect(warnings.length).toBeGreaterThan(0);

    // The directory is writable again and the file is gone, so the next run
    // reclaims the row it could not touch.
    await chmod(dirname(audio), 0o700);
    const secondRun = await prune(logger);

    expect(secondRun).toBe(1);
    expect(trackRow(trackId)).toBeUndefined();
  });

  it('removes a failed track with no associations', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    const { trackId } = seedTrack(database(), {
      fileStatus: TrackFileStatus.Failed
    });

    const removed = await prune(logger);

    expect(removed).toBe(1);
    expect(trackRow(trackId)).toBeUndefined();
  });

  it('does not remove anything the moment the last association goes, but the next run does', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    const relativePath = mediaRelativePath('aaaaaaaaaaa', '.m4a');
    const { trackId } = seedTrack(database(), { filePath: relativePath });
    const audio = await writeBytes(relativePath);
    const playlistId = seedPlaylist(
      database(),
      seedAccount(database()).accountId
    ).playlistId;
    associate(database(), playlistId, trackId);

    database()
      .db.delete(associations)
      .where(eq(associations.trackId, trackId))
      .run();

    // The removal itself reclaimed nothing.
    expect(trackRow(trackId)).toBeDefined();
    await expect(exists(audio)).resolves.toBe(true);

    const removed = await prune(logger);

    expect(removed).toBe(1);
    expect(trackRow(trackId)).toBeUndefined();
    await expect(exists(audio)).resolves.toBe(false);
  });

  it('removes nothing and returns zero when there is nothing to prune', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    const { trackId } = seedTrack(database());
    associate(
      database(),
      seedPlaylist(database(), seedAccount(database()).accountId).playlistId,
      trackId
    );

    const removed = await prune(logger);

    expect(removed).toBe(0);
    expect(trackRow(trackId)).toBeDefined();
  });

  it('counts only the tracks it actually removed', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    const { trackId: kept } = seedTrack(database());
    associate(
      database(),
      seedPlaylist(database(), seedAccount(database()).accountId).playlistId,
      kept
    );
    seedTrack(database());
    seedTrack(database());

    const removed = await prune(logger);

    expect(removed).toBe(2);
    expect(trackRow(kept)).toBeDefined();
  });

  it('treats a track only a suppressed video would re-add as an orphan', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    const { trackId } = seedTrack(database());
    const playlistId = seedPlaylist(
      database(),
      seedAccount(database()).accountId
    ).playlistId;

    // A suppression names a video id, not a track, and is not a reference.
    database()
      .db.insert(suppressions)
      .values({ playlistId, videoId: 'video-suppressed' })
      .run();

    const removed = await prune(logger);

    expect(removed).toBe(1);
    expect(trackRow(trackId)).toBeUndefined();
  });

  it('stops before the first track when the signal is already set', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    const relativePath = mediaRelativePath('aaaaaaaaaaa', '.m4a');
    const { trackId } = seedTrack(database(), { filePath: relativePath });
    const audio = await writeBytes(relativePath);
    const controller = new AbortController();
    controller.abort();

    const removed = await prune(logger, controller.signal);

    expect(removed).toBe(0);
    expect(trackRow(trackId)).toBeDefined();
    await expect(exists(audio)).resolves.toBe(true);
  });

  it('finishes the track in flight and leaves the rest for a later run', async () => {
    context = await createTestContext();

    // Three orphans in rowid order, the first failing to remove its media: the
    // logger warns, the controller aborts, and the run stops before the second.
    const controller = new AbortController();
    const { trackId: first } = seedTrack(database(), {
      filePath: mediaRelativePath('aaaaaaaaaaa', '.m4a')
    });
    const firstAudio = await writeBytes(
      mediaRelativePath('aaaaaaaaaaa', '.m4a')
    );
    await chmod(dirname(firstAudio), 0o500);

    const { trackId: second } = seedTrack(database());
    const { trackId: third } = seedTrack(database());

    const { logger } = abortsOnWarning(controller);

    const removed = await prune(logger, controller.signal);

    // Nothing was removed: the first track could not, and the abort stopped the
    // run before it reached the others.
    expect(removed).toBe(0);
    expect(trackRow(first)).toBeDefined();
    expect(trackRow(second)).toBeDefined();
    expect(trackRow(third)).toBeDefined();

    await chmod(dirname(firstAudio), 0o700);

    // A later run with no signal reclaims everything the stopped one left.
    const secondRun = await prune(recordingLogger().logger);

    expect(secondRun).toBe(3);
    expect(trackRow(first)).toBeUndefined();
    expect(trackRow(second)).toBeUndefined();
    expect(trackRow(third)).toBeUndefined();
  });

  it('finishes the removal in progress when the signal arrives during it', async () => {
    context = await createTestContext();

    // The first track fails to remove its media, warning and aborting; the run
    // stops before the second, which is untouched, not half removed.
    const controller = new AbortController();
    const { trackId: blocked } = seedTrack(database(), {
      filePath: mediaRelativePath('aaaaaaaaaaa', '.m4a')
    });
    const blockedAudio = await writeBytes(
      mediaRelativePath('aaaaaaaaaaa', '.m4a')
    );
    await chmod(dirname(blockedAudio), 0o500);

    const { trackId: untouched } = seedTrack(database());
    const { logger } = abortsOnWarning(controller);

    const removed = await prune(logger, controller.signal);

    expect(removed).toBe(0);
    expect(trackRow(blocked)).toBeDefined();
    expect(trackRow(untouched)).toBeDefined();
    // The file the run could not remove is still there, so the row is honest.
    await chmod(dirname(blockedAudio), 0o700);
    await expect(exists(blockedAudio)).resolves.toBe(true);
  });
});

/* Two hours, so the file is unambiguously past the one-hour grace window. */
const OLD_COVER_MS = 2 * 60 * 60 * 1000;

describe('pruning orphaned covers', () => {
  it('removes an unreferenced cover file older than the grace window', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    const orphan = await writeCover('orphan.webp', OLD_COVER_MS);

    const removed = await pruneCovers(logger);

    expect(removed).toBe(1);
    await expect(exists(orphan)).resolves.toBe(false);
  });

  it('keeps a referenced cover file however old it is', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    seedPlaylist(database(), seedAccount(database()).accountId, {
      coverPath: 'covers/referenced.webp'
    });
    const referenced = await writeCover('referenced.webp', OLD_COVER_MS);

    const removed = await pruneCovers(logger);

    expect(removed).toBe(0);
    await expect(exists(referenced)).resolves.toBe(true);
  });

  it('keeps an unreferenced cover inside the one-hour grace window', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    const fresh = await writeCover('fresh.webp');

    const removed = await pruneCovers(logger);

    expect(removed).toBe(0);
    await expect(exists(fresh)).resolves.toBe(true);
  });

  it('logs the number of cover files it removed', async () => {
    context = await createTestContext();
    const { logger, infos } = recordingLogger();
    await writeCover('one.webp', OLD_COVER_MS);
    await writeCover('two.webp', OLD_COVER_MS);

    const removed = await pruneCovers(logger);

    expect(removed).toBe(2);
    expect(infos).toContainEqual({
      removed: 2,
      message: 'cover prune finished'
    });
  });
});
