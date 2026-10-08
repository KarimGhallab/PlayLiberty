import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TrackFileStatus } from '@playliberty/contracts';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';
import { seedTrack } from '../../../app/testing/fixtures.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import { tracks } from '../../../platform/database/schema.js';
import type { DownloadQueueContext } from './downloadQueue.js';
import { withDownloadQueue } from './downloadQueue.js';

/*
 * The seam is what makes the wake structural: an operation opens a queue, moves
 * tracks through it, and the worker is woken once at the end if anything queued.
 * These tests drive it directly, at its interface, rather than through a route.
 */

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

function queueContext(kick: () => void): DownloadQueueContext {
  return { database: database(), kickDownloads: kick };
}

function readFileStatus(trackId: string): TrackFileStatus | undefined {
  return database()
    .db.select({ fileStatus: tracks.fileStatus })
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .get()?.fileStatus;
}

describe('withDownloadQueue', () => {
  it('creates a pending track and wakes the worker once', async () => {
    context = await createTestContext();
    const kick = vi.fn();

    const trackId = withDownloadQueue(queueContext(kick), queue =>
      queue.create({
        videoId: 'aaaaaaaaaaa',
        title: 'Track',
        durationSeconds: 180,
        thumbnailUrl: null,
        skipNonMusic: true
      })
    );

    expect(readFileStatus(trackId)).toBe(TrackFileStatus.Pending);
    expect(kick).toHaveBeenCalledTimes(1);
  });

  it('wakes once for a whole batch of queued tracks', async () => {
    context = await createTestContext();
    const kick = vi.fn();
    const failed = seedTrack(database(), {
      fileStatus: TrackFileStatus.Failed
    }).trackId;

    withDownloadQueue(queueContext(kick), queue => {
      queue.create({
        videoId: 'aaaaaaaaaaa',
        title: 'One',
        durationSeconds: 180,
        thumbnailUrl: null,
        skipNonMusic: true
      });
      queue.create({
        videoId: 'bbbbbbbbbbb',
        title: 'Two',
        durationSeconds: 200,
        thumbnailUrl: null,
        skipNonMusic: true
      });
      queue.retry(failed);
    });

    expect(kick).toHaveBeenCalledTimes(1);
  });

  it('wakes when a retry applies and not when it is refused', async () => {
    context = await createTestContext();
    const kick = vi.fn();
    const failed = seedTrack(database(), {
      fileStatus: TrackFileStatus.Failed
    }).trackId;
    const stored = seedTrack(database(), {
      fileStatus: TrackFileStatus.Stored
    }).trackId;

    withDownloadQueue(queueContext(kick), queue => {
      queue.retry(failed);
    });

    expect(readFileStatus(failed)).toBe(TrackFileStatus.Pending);
    expect(kick).toHaveBeenCalledTimes(1);

    kick.mockClear();

    withDownloadQueue(queueContext(kick), queue => {
      queue.retry(stored);
    });

    expect(kick).not.toHaveBeenCalled();
  });

  it('wakes when a whole-fetch applies and not when it is refused', async () => {
    context = await createTestContext();
    const kick = vi.fn();
    const pending = seedTrack(database(), {
      fileStatus: TrackFileStatus.Pending
    }).trackId;
    const stored = seedTrack(database(), {
      fileStatus: TrackFileStatus.Stored
    }).trackId;

    withDownloadQueue(queueContext(kick), queue => {
      queue.fetchWhole(pending);
    });

    expect(kick).toHaveBeenCalledTimes(1);

    kick.mockClear();

    withDownloadQueue(queueContext(kick), queue => {
      queue.fetchWhole(stored);
    });

    expect(kick).not.toHaveBeenCalled();
  });

  it('does not wake when the operation queues nothing', async () => {
    context = await createTestContext();
    const kick = vi.fn();

    withDownloadQueue(queueContext(kick), () => undefined);

    expect(kick).not.toHaveBeenCalled();
  });
});
