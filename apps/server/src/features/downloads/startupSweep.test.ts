import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import {
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import { createTestContext } from '../../app/testing/createTestContext.js';
import type { TestContext } from '../../app/testing/createTestContext.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { tracks } from '../../platform/database/schema.js';
import { mediaRelativePath } from '../../platform/media/mediaPaths.js';
import { runStartupSweep } from './startupSweep.js';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

function seedTrack(
  database: DatabaseHandle,
  options: { fileStatus: TrackFileStatus; filePath?: string | null }
): string {
  const id = randomUUID();

  database.db
    .insert(tracks)
    .values({
      id,
      provider: Provider.Youtube,
      videoId: 'aaaaaaaaaaa',
      title: 'Track',
      durationSeconds: null,
      thumbnailPath: null,
      thumbnailUrl: null,
      fileStatus: options.fileStatus,
      sourceStatus: TrackSourceStatus.Available,
      filePath: options.filePath ?? null,
      failureReason: null
    })
    .run();

  return id;
}

function trackRow(trackId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database.db
    .select()
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .get();
}

describe('the startup sweep', () => {
  it('empties the temporary directory and re-queues an interrupted download', async () => {
    context = await createTestContext();
    const trackId = seedTrack(context.database, {
      fileStatus: TrackFileStatus.Downloading
    });

    // A download that was interrupted: a temporary file, a row still claiming to
    // be downloading, and no stored file.
    const tempFile = join(context.mediaPaths.tempDir, 'aaaaaaaaaaa.stored.m4a');
    await mkdir(dirname(tempFile), { recursive: true });
    await writeFile(tempFile, 'half a download');

    const result = await runStartupSweep(context.mediaPaths, context.database);

    expect(result.tracksReset).toBe(1);
    expect(result.tempEntriesRemoved).toBe(1);
    expect(trackRow(trackId)?.fileStatus).toBe(TrackFileStatus.Pending);

    await expect(readdir(context.mediaPaths.tempDir)).resolves.toEqual([]);
    const storedPath = join(
      context.mediaPaths.root,
      mediaRelativePath('aaaaaaaaaaa', '.m4a')
    );
    await expect(readFile(storedPath)).rejects.toThrow();
  });

  it('leaves a stored track and its file alone', async () => {
    context = await createTestContext();
    const relativePath = mediaRelativePath('aaaaaaaaaaa', '.m4a');
    const trackId = seedTrack(context.database, {
      fileStatus: TrackFileStatus.Stored,
      filePath: relativePath
    });
    const storedPath = join(context.mediaPaths.root, relativePath);
    await mkdir(dirname(storedPath), { recursive: true });
    await writeFile(storedPath, 'stored-audio');

    const result = await runStartupSweep(context.mediaPaths, context.database);

    expect(result.tracksReset).toBe(0);
    expect(trackRow(trackId)?.fileStatus).toBe(TrackFileStatus.Stored);
    await expect(readFile(storedPath, 'utf8')).resolves.toBe('stored-audio');
  });
});
