import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AssociationOrigin,
  Provider,
  TrackFileStatus,
  TrackSourceStatus,
  UserRole
} from '@playliberty/contracts';
import { YoutubeVideoUnavailableError } from '@playliberty/youtube';
import type {
  DownloadTrackRequest,
  DownloadTrackResult,
  IYoutubeClient
} from '@playliberty/youtube';

import { createTestContext } from '../../app/testing/createTestContext.js';
import type { TestContext } from '../../app/testing/createTestContext.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import {
  accounts,
  associations,
  playlists,
  tracks
} from '../../platform/database/schema.js';
import {
  mediaRelativePath,
  thumbnailRelativePath
} from '../../platform/media/mediaPaths.js';
import { processPendingTracks, startDownloadWorker } from './downloadWorker.js';
import type { DownloadWorkerHandle } from './downloadWorker.js';

let context: TestContext | undefined;
let worker: DownloadWorkerHandle | undefined;

afterEach(async () => {
  await worker?.stop();
  worker = undefined;
  await context?.cleanup();
  context = undefined;
});

/*
 * A stand-in for the adapter that writes a real file where the worker asked for
 * it, so the store, the move and the stream route are exercised on real bytes
 * rather than on a claim that a file exists. It records the video ids it was
 * asked to fetch, which is how a test says a track was never claimed without
 * reading the row it did not touch.
 */
interface FakeDownloaderOptions {
  failTimes?: number;
  error?: Error;
  thumbnailFails?: boolean;
}

function fakeDownloader(options: FakeDownloaderOptions = {}): {
  youtube: IYoutubeClient;
  downloads: string[];
  stats: { maxActive: number };
} {
  const downloads: string[] = [];
  const stats = { maxActive: 0 };
  let active = 0;
  let failures = options.failTimes ?? 0;

  return {
    downloads,
    stats,
    youtube: {
      listSource: async () => {
        throw new Error('the download worker must not read the source');
      },
      downloadTrack: async (
        request: DownloadTrackRequest
      ): Promise<DownloadTrackResult> => {
        downloads.push(request.videoId);

        if (failures > 0) {
          failures -= 1;
          throw options.error ?? new Error('the download failed');
        }

        active += 1;
        stats.maxActive = Math.max(stats.maxActive, active);
        // Yield, so two claimed downloads overlap and a cap above one is
        // observable rather than theoretical.
        await new Promise(resolve => setTimeout(resolve, 0));

        await mkdir(dirname(request.outputPath), { recursive: true });
        await writeFile(request.outputPath, 'downloaded-audio');
        active -= 1;

        return { videoId: request.videoId, filePath: request.outputPath };
      },
      fetchThumbnail: async (
        _url: string,
        outputPath: string
      ): Promise<void> => {
        if (options.thumbnailFails === true) {
          throw new Error('the thumbnail failed');
        }

        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, 'thumbnail-bytes');
      }
    }
  };
}

function createAccount(
  database: DatabaseHandle,
  pangolinUserId: string
): string {
  const id = randomUUID();

  database.db
    .insert(accounts)
    .values({
      id,
      pangolinUserId,
      displayName: 'Account',
      email: null,
      avatarUrl: null,
      role: UserRole.User
    })
    .run();

  return id;
}

function seedPlaylist(
  database: DatabaseHandle,
  ownerAccountId: string
): string {
  const id = randomUUID();

  database.db
    .insert(playlists)
    .values({
      id,
      ownerAccountId,
      name: 'Playlist',
      coverUrl: null,
      provider: Provider.Youtube,
      sourcePlaylistId: `source-${id}`
    })
    .run();

  return id;
}

interface SeedOptions {
  videoId?: string;
  fileStatus?: TrackFileStatus;
  filePath?: string | null;
  thumbnailUrl?: string | null;
}

interface Seeded {
  pangolinUserId: string;
  playlistId: string;
  trackId: string;
  videoId: string;
}

function seed(
  database: DatabaseHandle,
  options: SeedOptions = {},
  pangolinUserId = 'owner-1'
): Seeded {
  const accountId = createAccount(database, pangolinUserId);
  const playlistId = seedPlaylist(database, accountId);
  const trackId = randomUUID();
  const videoId = options.videoId ?? 'aaaaaaaaaaa';

  database.db
    .insert(tracks)
    .values({
      id: trackId,
      provider: Provider.Youtube,
      videoId,
      title: 'Track',
      durationSeconds: null,
      thumbnailPath: null,
      thumbnailUrl: options.thumbnailUrl ?? null,
      fileStatus: options.fileStatus ?? TrackFileStatus.Pending,
      sourceStatus: TrackSourceStatus.Available,
      filePath: options.filePath ?? null,
      failureReason: null
    })
    .run();

  database.db
    .insert(associations)
    .values({
      id: randomUUID(),
      playlistId,
      trackId,
      origin: AssociationOrigin.Remote,
      position: 0
    })
    .run();

  return { pangolinUserId, playlistId, trackId, videoId };
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

function run(youtube: IYoutubeClient, concurrency = 1) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return processPendingTracks(
    {
      database: context.database,
      mediaPaths: context.mediaPaths,
      youtube
    },
    context.app.log,
    concurrency
  );
}

describe('the download worker', () => {
  it('downloads a pending track into the media store and serves it', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);

    const relativePath = mediaRelativePath('aaaaaaaaaaa', '.m4a');
    const row = trackRow(seeded.trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Stored);
    expect(row?.filePath).toBe(relativePath);
    expect(row?.failureReason).toBeNull();

    const storedBytes = await readFile(
      join(context.directory, 'media', relativePath),
      'utf8'
    );
    expect(storedBytes).toBe('downloaded-audio');

    const response = await context.app.inject({
      method: 'GET',
      url: `/api/v1/tracks/${seeded.trackId}/stream`,
      headers: { 'remote-user': seeded.pangolinUserId }
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('downloaded-audio');
  });

  it('does not start the same download twice', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);
    await run(fake.youtube);

    expect(fake.downloads).toEqual([seeded.videoId]);
  });

  it('never claims a stored track and serves it to a second association', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);
    expect(fake.downloads).toEqual([seeded.videoId]);

    // A second account associates the same track row.
    const otherAccountId = createAccount(context.database, 'owner-2');
    const otherPlaylistId = seedPlaylist(context.database, otherAccountId);
    context.database.db
      .insert(associations)
      .values({
        id: randomUUID(),
        playlistId: otherPlaylistId,
        trackId: seeded.trackId,
        origin: AssociationOrigin.Remote,
        position: 0
      })
      .run();

    fake.downloads.length = 0;
    await run(fake.youtube);

    expect(fake.downloads).toEqual([]);

    const response = await context.app.inject({
      method: 'GET',
      url: `/api/v1/tracks/${seeded.trackId}/stream`,
      headers: { 'remote-user': 'owner-2' }
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('downloaded-audio');
  });

  it('leaves a failed track with a short reason and no stored file', async () => {
    const fake = fakeDownloader({
      failTimes: 1,
      error: new Error('yt-dlp exited with code 1: ERROR: something went wrong')
    });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);

    const row = trackRow(seeded.trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Failed);
    expect(row?.filePath).toBeNull();
    expect(row?.failureReason).toBe(
      'yt-dlp exited with code 1: ERROR: something went wrong'
    );
  });

  it('reduces a multi-line failure to one short line', async () => {
    const fake = fakeDownloader({
      failTimes: 1,
      error: new Error(
        'ERROR: the first thing\nTraceback (most recent call last):\n  more'
      )
    });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);

    const reason = trackRow(seeded.trackId)?.failureReason ?? '';
    expect(reason).not.toContain('\n');
    expect(reason.length).toBeLessThanOrEqual(200);
    expect(reason.startsWith('ERROR: the first thing')).toBe(true);
  });

  it('does not retry a failed track on a later pass', async () => {
    const fake = fakeDownloader({ failTimes: 1 });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);
    await run(fake.youtube);

    expect(trackRow(seeded.trackId)?.fileStatus).toBe(TrackFileStatus.Failed);
    expect(fake.downloads).toEqual([seeded.videoId]);
  });

  it('treats a video that is gone as terminal rather than a failure', async () => {
    const fake = fakeDownloader({
      failTimes: 1,
      error: new YoutubeVideoUnavailableError('aaaaaaaaaaa')
    });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);

    const row = trackRow(seeded.trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Unavailable);
    expect(row?.sourceStatus).toBe(TrackSourceStatus.Removed);
    expect(row?.filePath).toBeNull();

    // A later pass does not retry it, and neither does a sync.
    await run(fake.youtube);
    expect(fake.downloads).toEqual([seeded.videoId]);
  });

  it('fetches the artwork and records its path', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, {
      videoId: 'aaaaaaaaaaa',
      thumbnailUrl: 'https://i.ytimg.com/vi/aaaaaaaaaaa/hq.jpg'
    });

    await run(fake.youtube);

    const relativePath = thumbnailRelativePath('aaaaaaaaaaa');
    const row = trackRow(seeded.trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Stored);
    expect(row?.thumbnailPath).toBe(relativePath);

    const bytes = await readFile(
      join(context.directory, 'media', relativePath),
      'utf8'
    );
    expect(bytes).toBe('thumbnail-bytes');
  });

  it('leaves the artwork null when the fetch fails and still stores the audio', async () => {
    const fake = fakeDownloader({ thumbnailFails: true });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, {
      videoId: 'aaaaaaaaaaa',
      thumbnailUrl: 'https://i.ytimg.com/vi/aaaaaaaaaaa/hq.jpg'
    });

    await run(fake.youtube);

    const row = trackRow(seeded.trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Stored);
    expect(row?.thumbnailPath).toBeNull();
  });

  it('runs no more than the configured number of downloads at once', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    seed(context.database, { videoId: 'aaaaaaaaaaa' }, 'owner-1');
    seed(context.database, { videoId: 'bbbbbbbbbbb' }, 'owner-2');
    seed(context.database, { videoId: 'ccccccccccc' }, 'owner-3');

    await run(fake.youtube, 2);

    expect(fake.stats.maxActive).toBe(2);
  });

  it('leaves the rest for the next pass when the backlog exceeds the cap', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = [
      seed(context.database, { videoId: 'aaaaaaaaaaa' }, 'owner-1'),
      seed(context.database, { videoId: 'bbbbbbbbbbb' }, 'owner-2'),
      seed(context.database, { videoId: 'ccccccccccc' }, 'owner-3')
    ];

    await run(fake.youtube, 2);

    const afterFirst = seeded.map(entry => trackRow(entry.trackId)?.fileStatus);
    expect(
      afterFirst.filter(status => status === TrackFileStatus.Stored)
    ).toHaveLength(2);
    expect(
      afterFirst.filter(status => status === TrackFileStatus.Pending)
    ).toHaveLength(1);

    await run(fake.youtube, 2);

    const afterSecond = seeded.map(
      entry => trackRow(entry.trackId)?.fileStatus
    );
    expect(afterSecond.every(status => status === TrackFileStatus.Stored)).toBe(
      true
    );
  });

  it('stops only after the download in flight has finished', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    let signalStarted!: () => void;
    const started = new Promise<void>(resolve => {
      signalStarted = resolve;
    });
    const downloads: string[] = [];

    const youtube: IYoutubeClient = {
      listSource: async () => {
        throw new Error('the download worker must not read the source');
      },
      downloadTrack: async (
        request: DownloadTrackRequest
      ): Promise<DownloadTrackResult> => {
        downloads.push(request.videoId);
        signalStarted();
        await gate;
        await mkdir(dirname(request.outputPath), { recursive: true });
        await writeFile(request.outputPath, 'downloaded-audio');
        return { videoId: request.videoId, filePath: request.outputPath };
      },
      fetchThumbnail: async () => {
        throw new Error('the download worker must not fetch a thumbnail');
      }
    };

    context = await createTestContext({}, { youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    worker = startDownloadWorker({
      context: {
        database: context.database,
        mediaPaths: context.mediaPaths,
        youtube
      },
      concurrency: 1,
      logger: context.app.log,
      intervalMs: 5
    });

    await started;

    let stopped = false;
    const stopping = worker.stop().then(() => {
      stopped = true;
    });

    // The download is still in flight, so the stop has not resolved.
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(stopped).toBe(false);

    release();
    await stopping;

    expect(stopped).toBe(true);
    expect(trackRow(seeded.trackId)?.fileStatus).toBe(TrackFileStatus.Stored);
    // The interval was cleared, so no further pass ran.
    expect(downloads).toEqual([seeded.videoId]);
  });

  it('runs one pass immediately rather than waiting for the first interval', async () => {
    const downloads: string[] = [];
    const youtube: IYoutubeClient = {
      listSource: async () => {
        throw new Error('the download worker must not read the source');
      },
      downloadTrack: async (
        request: DownloadTrackRequest
      ): Promise<DownloadTrackResult> => {
        downloads.push(request.videoId);
        await mkdir(dirname(request.outputPath), { recursive: true });
        await writeFile(request.outputPath, 'downloaded-audio');
        return { videoId: request.videoId, filePath: request.outputPath };
      },
      fetchThumbnail: async () => {
        throw new Error('the download worker must not fetch a thumbnail');
      }
    };

    context = await createTestContext({}, { youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    worker = startDownloadWorker({
      context: {
        database: context.database,
        mediaPaths: context.mediaPaths,
        youtube
      },
      concurrency: 1,
      logger: context.app.log,
      // An interval far longer than the test, so the only pass that can run is the
      // immediate one.
      intervalMs: 60_000
    });

    // No `started` gate to wait on: the claim is that the row is already stored
    // before any interval could fire.
    await vi.waitFor(() => {
      expect(trackRow(seeded.trackId)?.fileStatus).toBe(TrackFileStatus.Stored);
    });

    expect(downloads).toEqual([seeded.videoId]);
  });
});
