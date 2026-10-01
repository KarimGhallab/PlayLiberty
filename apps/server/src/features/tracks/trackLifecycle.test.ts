import { randomUUID } from 'node:crypto';

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
import { markTrackSourceRemoved } from './trackLifecycle.js';

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
      videoId: `video-${id}`,
      title: 'Track',
      durationSeconds: null,
      thumbnailPath: null,
      fileStatus: options.fileStatus,
      sourceStatus: TrackSourceStatus.Available,
      filePath: options.filePath ?? null,
      failureReason: null
    })
    .run();

  return id;
}

function readTrack(trackId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database.db
    .select()
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .get();
}

describe('marking a track removed from its source', () => {
  it('keeps a stored file and moves only the source status', async () => {
    context = await createTestContext();
    const trackId = seedTrack(context.database, {
      fileStatus: TrackFileStatus.Stored,
      filePath: 'media/aa/video.m4a'
    });

    markTrackSourceRemoved(context.database, trackId, TrackFileStatus.Stored);

    const row = readTrack(trackId);
    expect(row?.sourceStatus).toBe(TrackSourceStatus.Removed);
    expect(row?.fileStatus).toBe(TrackFileStatus.Stored);
    expect(row?.filePath).toBe('media/aa/video.m4a');
  });

  it('makes a track with no file unavailable', async () => {
    context = await createTestContext();
    const trackId = seedTrack(context.database, {
      fileStatus: TrackFileStatus.Pending
    });

    markTrackSourceRemoved(context.database, trackId, TrackFileStatus.Pending);

    const row = readTrack(trackId);
    expect(row?.sourceStatus).toBe(TrackSourceStatus.Removed);
    expect(row?.fileStatus).toBe(TrackFileStatus.Unavailable);
    expect(row?.filePath).toBeNull();
  });
});
