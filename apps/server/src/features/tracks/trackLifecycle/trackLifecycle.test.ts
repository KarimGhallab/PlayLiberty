import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import {
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import { tracks } from '../../../platform/database/schema.js';
import {
  TrackTransitionOutcome,
  claimPendingTracks,
  createPendingTrack,
  failTrack,
  fetchTrackWhole,
  markTrackSourceRemoved,
  removeTrack,
  resetDownloadingTracks,
  retryTrack,
  storeThumbnail,
  storeTrack
} from './trackLifecycle.js';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

interface SeedOptions {
  fileStatus?: TrackFileStatus;
  sourceStatus?: TrackSourceStatus;
  filePath?: string | null;
  failureReason?: string | null;
  durationSeconds?: number | null;
  skipNonMusic?: boolean;
  thumbnailPath?: string | null;
}

function database(): DatabaseHandle {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database;
}

function seedTrack(
  database: DatabaseHandle,
  options: SeedOptions = {}
): string {
  const id = randomUUID();

  database.db
    .insert(tracks)
    .values({
      id,
      provider: Provider.Youtube,
      videoId: `video-${id}`,
      title: 'Track',
      durationSeconds: options.durationSeconds ?? null,
      skipNonMusic: options.skipNonMusic ?? true,
      thumbnailPath: options.thumbnailPath ?? null,
      fileStatus: options.fileStatus ?? TrackFileStatus.Pending,
      sourceStatus: options.sourceStatus ?? TrackSourceStatus.Available,
      filePath: options.filePath ?? null,
      failureReason: options.failureReason ?? null
    })
    .run();

  return id;
}

function readTrack(trackId: string) {
  return database()
    .db.select()
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .get();
}

describe('creating a track', () => {
  it('queues a pending, available, fileless track', async () => {
    context = await createTestContext();

    const trackId = createPendingTrack(database(), {
      videoId: 'aaaaaaaaaaa',
      title: 'Track',
      durationSeconds: 180,
      thumbnailUrl: null,
      skipNonMusic: true
    });

    const row = readTrack(trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Pending);
    expect(row?.sourceStatus).toBe(TrackSourceStatus.Available);
    expect(row?.filePath).toBeNull();
    expect(row?.failureReason).toBeNull();
  });
});

describe('claiming pending tracks for download', () => {
  it('moves the oldest pending rows to downloading and returns them', async () => {
    context = await createTestContext();
    const first = seedTrack(database());
    const second = seedTrack(database());

    const claimed = claimPendingTracks(database(), 2);

    expect(claimed.map(row => row.id).sort()).toEqual([first, second].sort());
    expect(readTrack(first)?.fileStatus).toBe(TrackFileStatus.Downloading);
    expect(readTrack(second)?.fileStatus).toBe(TrackFileStatus.Downloading);
  });

  it('claims no more than the cap and leaves the rest pending', async () => {
    context = await createTestContext();
    seedTrack(database());
    seedTrack(database());

    const claimed = claimPendingTracks(database(), 1);

    expect(claimed).toHaveLength(1);
  });

  it('never claims a track that is not pending', async () => {
    context = await createTestContext();
    const stored = seedTrack(database(), {
      fileStatus: TrackFileStatus.Stored
    });

    const claimed = claimPendingTracks(database(), 5);

    expect(claimed).toEqual([]);
    expect(readTrack(stored)?.fileStatus).toBe(TrackFileStatus.Stored);
  });
});

describe('storing and failing a claimed download', () => {
  it('stores a downloading track with its file and the duration the adapter reported', async () => {
    context = await createTestContext();
    const trackId = seedTrack(database(), {
      fileStatus: TrackFileStatus.Downloading,
      durationSeconds: 180,
      failureReason: 'a stale reason'
    });

    const result = storeTrack(database(), trackId, {
      filePath: 'media/aa/video.m4a',
      durationSeconds: 42
    });

    expect(result.outcome).toBe(TrackTransitionOutcome.Applied);
    const row = readTrack(trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Stored);
    expect(row?.filePath).toBe('media/aa/video.m4a');
    expect(row?.durationSeconds).toBe(42);
    expect(row?.failureReason).toBeNull();
  });

  it('refuses to store a track that was not downloading', async () => {
    context = await createTestContext();
    const trackId = seedTrack(database(), {
      fileStatus: TrackFileStatus.Pending
    });

    const result = storeTrack(database(), trackId, {
      filePath: 'media/aa/video.m4a',
      durationSeconds: 42
    });

    expect(result.outcome).toBe(TrackTransitionOutcome.Refused);
    expect(readTrack(trackId)?.fileStatus).toBe(TrackFileStatus.Pending);
  });

  it('fails a downloading track with its reason', async () => {
    context = await createTestContext();
    const trackId = seedTrack(database(), {
      fileStatus: TrackFileStatus.Downloading
    });

    const result = failTrack(database(), trackId, 'the download failed');

    expect(result.outcome).toBe(TrackTransitionOutcome.Applied);
    const row = readTrack(trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Failed);
    expect(row?.failureReason).toBe('the download failed');
  });

  it('refuses to fail a stored track', async () => {
    context = await createTestContext();
    const trackId = seedTrack(database(), {
      fileStatus: TrackFileStatus.Stored,
      filePath: 'media/aa/video.m4a'
    });

    const result = failTrack(database(), trackId, 'boom');

    expect(result.outcome).toBe(TrackTransitionOutcome.Refused);
    expect(readTrack(trackId)?.fileStatus).toBe(TrackFileStatus.Stored);
  });

  it('reports a missing track', async () => {
    context = await createTestContext();

    const result = storeTrack(database(), randomUUID(), {
      filePath: 'media/aa/video.m4a',
      durationSeconds: 1
    });

    expect(result.outcome).toBe(TrackTransitionOutcome.Missing);
  });
});

describe('returning a track to the queue', () => {
  it('retries a failed track to pending and clears the reason', async () => {
    context = await createTestContext();
    const trackId = seedTrack(database(), {
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'a failure'
    });

    const result = retryTrack(database(), trackId);

    expect(result.outcome).toBe(TrackTransitionOutcome.Applied);
    const row = readTrack(trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Pending);
    expect(row?.failureReason).toBeNull();
  });

  it.each([
    TrackFileStatus.Pending,
    TrackFileStatus.Downloading,
    TrackFileStatus.Stored,
    TrackFileStatus.Unavailable
  ])('refuses to retry a %s track', async fileStatus => {
    context = await createTestContext();
    const trackId = seedTrack(database(), { fileStatus });

    expect(retryTrack(database(), trackId).outcome).toBe(
      TrackTransitionOutcome.Refused
    );
    expect(readTrack(trackId)?.fileStatus).toBe(fileStatus);
  });

  it('fetches a pending track whole, turning the policy off', async () => {
    context = await createTestContext();
    const trackId = seedTrack(database(), {
      fileStatus: TrackFileStatus.Pending,
      skipNonMusic: true
    });

    const result = fetchTrackWhole(database(), trackId);

    expect(result.outcome).toBe(TrackTransitionOutcome.Applied);
    const row = readTrack(trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Pending);
    expect(row?.skipNonMusic).toBe(false);
    expect(row?.failureReason).toBeNull();
  });

  it('fetches a failed track whole, turning the policy off', async () => {
    context = await createTestContext();
    const trackId = seedTrack(database(), {
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'boom',
      skipNonMusic: true
    });

    expect(fetchTrackWhole(database(), trackId).outcome).toBe(
      TrackTransitionOutcome.Applied
    );
    const row = readTrack(trackId);
    expect(row?.skipNonMusic).toBe(false);
    expect(row?.failureReason).toBeNull();
  });

  it.each([
    TrackFileStatus.Stored,
    TrackFileStatus.Downloading,
    TrackFileStatus.Unavailable
  ])('refuses to fetch a %s track whole', async fileStatus => {
    context = await createTestContext();
    const trackId = seedTrack(database(), { fileStatus, skipNonMusic: true });

    expect(fetchTrackWhole(database(), trackId).outcome).toBe(
      TrackTransitionOutcome.Refused
    );
    const row = readTrack(trackId);
    expect(row?.fileStatus).toBe(fileStatus);
    expect(row?.skipNonMusic).toBe(true);
  });
});

describe('marking a track removed from its source', () => {
  it('keeps a stored file and moves only the source status', async () => {
    context = await createTestContext();
    const trackId = seedTrack(database(), {
      fileStatus: TrackFileStatus.Stored,
      filePath: 'media/aa/video.m4a'
    });

    const result = markTrackSourceRemoved(database(), trackId);

    expect(result.outcome).toBe(TrackTransitionOutcome.Applied);
    const row = readTrack(trackId);
    expect(row?.sourceStatus).toBe(TrackSourceStatus.Removed);
    expect(row?.fileStatus).toBe(TrackFileStatus.Stored);
    expect(row?.filePath).toBe('media/aa/video.m4a');
  });

  it('makes a track with no file unavailable', async () => {
    context = await createTestContext();
    const trackId = seedTrack(database(), {
      fileStatus: TrackFileStatus.Pending
    });

    markTrackSourceRemoved(database(), trackId);

    const row = readTrack(trackId);
    expect(row?.sourceStatus).toBe(TrackSourceStatus.Removed);
    expect(row?.fileStatus).toBe(TrackFileStatus.Unavailable);
    expect(row?.filePath).toBeNull();
  });

  it('refuses a track already marked removed', async () => {
    context = await createTestContext();
    const trackId = seedTrack(database(), {
      fileStatus: TrackFileStatus.Stored,
      sourceStatus: TrackSourceStatus.Removed,
      filePath: 'media/aa/video.m4a'
    });

    expect(markTrackSourceRemoved(database(), trackId).outcome).toBe(
      TrackTransitionOutcome.Refused
    );
    expect(readTrack(trackId)?.fileStatus).toBe(TrackFileStatus.Stored);
  });
});

describe('the startup reset', () => {
  it('returns every downloading track to pending and counts only those', async () => {
    context = await createTestContext();
    const downloading = seedTrack(database(), {
      fileStatus: TrackFileStatus.Downloading
    });
    const stored = seedTrack(database(), {
      fileStatus: TrackFileStatus.Stored
    });

    const reset = resetDownloadingTracks(database());

    expect(reset).toBe(1);
    expect(readTrack(downloading)?.fileStatus).toBe(TrackFileStatus.Pending);
    expect(readTrack(stored)?.fileStatus).toBe(TrackFileStatus.Stored);
  });
});

describe('the artwork and the row', () => {
  it('records a stored thumbnail path', async () => {
    context = await createTestContext();
    const trackId = seedTrack(database(), {
      fileStatus: TrackFileStatus.Stored
    });

    storeThumbnail(database(), trackId, 'thumbnails/aa/video.jpg');

    expect(readTrack(trackId)?.thumbnailPath).toBe('thumbnails/aa/video.jpg');
  });

  it('removes a track row', async () => {
    context = await createTestContext();
    const trackId = seedTrack(database());

    removeTrack(database(), trackId);

    expect(readTrack(trackId)).toBeUndefined();
  });
});
