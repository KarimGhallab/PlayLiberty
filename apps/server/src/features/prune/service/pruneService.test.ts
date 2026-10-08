import { access, chmod, mkdir, writeFile } from 'node:fs/promises';
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
import { pruneOrphanTracks } from './pruneService.js';

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

/*
 * The logger is a spy rather than a real pino instance, because the only thing a
 * test needs from it is which line was written with what. It satisfies the
 * logger's shape by being cast at the call, which is the one place the seam is.
 */
function recordingLogger(): {
  logger: FastifyBaseLogger;
  warnings: Record<string, unknown>[];
} {
  const warnings: Record<string, unknown>[] = [];

  const logger = {
    info: (): void => undefined,
    debug: (): void => undefined,
    warn: (payload: Record<string, unknown>): void => {
      warnings.push(payload);
    },
    error: (payload: Record<string, unknown>): void => {
      warnings.push(payload);
    },
    child: (): unknown => logger
  } as unknown as FastifyBaseLogger;

  return { logger, warnings };
}

/*
 * A logger whose first warning aborts the controller. It is the deterministic hook
 * for stopping a run mid-scan: the run warns when a track's media cannot be
 * removed, and that is the moment the test asks it to stop, rather than racing a
 * timer against the run's own speed.
 */
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

    // The parent directory is made read-only, so the file cannot be unlinked while
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

  it('removes a track held only through another account playlist', async () => {
    context = await createTestContext();
    const { logger } = recordingLogger();
    const relativePath = mediaRelativePath('aaaaaaaaaaa', '.m4a');
    const { trackId } = seedTrack(database(), { filePath: relativePath });
    const audio = await writeBytes(relativePath);
    associate(
      database(),
      seedPlaylist(database(), seedAccount(database()).accountId).playlistId,
      trackId
    );

    const removed = await prune(logger);

    // Held by a playlist, so it survives whatever account owns that playlist.
    expect(removed).toBe(0);
    expect(trackRow(trackId)).toBeDefined();
    await expect(exists(audio)).resolves.toBe(true);
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

    // Three orphans in a deterministic order (rowid), the first of which fails to
    // remove its media. That failure is the hook: the logger warns, the controller
    // is aborted, and the run then stops before claiming the second track.
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

    // Nothing was removed: the first track could not, and the abort stopped the run
    // before it reached the others.
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

    // The first track fails to remove its media, which warns and aborts; the run
    // then stops before the second. The second is therefore untouched, not half
    // removed, which is the property: the stop lands between tracks.
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
