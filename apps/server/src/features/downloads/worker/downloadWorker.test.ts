import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LiveEvent } from '@playliberty/contracts';
import {
  AssociationOrigin,
  FailureKind,
  LiveEventType,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import type {
  DownloadTrackRequest,
  DownloadTrackResult,
  IYoutubeClient
} from '@playliberty/youtube';
import {
  EgressCircuitOpenError,
  EgressSourceUnavailableError,
  EgressStreamError,
  EgressSwitchFailedError,
  SPONSORBLOCK_FAILURE_REASON,
  YoutubeSponsorBlockError,
  YoutubeVideoUnavailableError
} from '@playliberty/youtube';

import { EventBus } from '../../../shared/events/eventBus/EventBus.js';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';
import {
  associate,
  seedAccount,
  seedPlaylist,
  seedShare,
  seedTrack
} from '../../../app/testing/fixtures.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import { associations, tracks } from '../../../platform/database/schema.js';
import {
  mediaRelativePath,
  thumbnailRelativePath
} from '../../../platform/media/mediaPaths.js';
import type { DownloadWorkerHandle } from './downloadWorker.js';
import { processPendingTracks, startDownloadWorker } from './downloadWorker.js';

let context: TestContext | undefined;
let worker: DownloadWorkerHandle | undefined;

afterEach(async () => {
  await worker?.stop();
  worker = undefined;
  await context?.cleanup();
  context = undefined;
});

/* An adapter that writes a real file where the worker asked, so the store, the
 * move and the stream route run on real bytes. It records video ids fetched. */
interface FakeDownloaderOptions {
  failTimes?: number;
  error?: Error;
  thumbnailFails?: boolean;
}

function fakeDownloader(options: FakeDownloaderOptions = {}): {
  youtube: IYoutubeClient;
  downloads: string[];
  requests: DownloadTrackRequest[];
  stats: { maxActive: number };
} {
  const downloads: string[] = [];
  const requests: DownloadTrackRequest[] = [];
  const stats = { maxActive: 0 };
  let active = 0;
  let failures = options.failTimes ?? 0;

  return {
    downloads,
    requests,
    stats,
    youtube: {
      listSource: async () => {
        throw new Error('the download worker must not read the source');
      },
      downloadTrack: async (
        request: DownloadTrackRequest
      ): Promise<DownloadTrackResult> => {
        downloads.push(request.videoId);
        requests.push(request);

        if (failures > 0) {
          failures -= 1;
          throw options.error ?? new Error('the download failed');
        }

        active += 1;
        stats.maxActive = Math.max(stats.maxActive, active);
        // Yield, so two claimed downloads overlap and a cap above one is seen
        // rather than theoretical.
        await new Promise(resolve => setTimeout(resolve, 0));

        await mkdir(dirname(request.outputPath), { recursive: true });
        await writeFile(request.outputPath, 'downloaded-audio');
        active -= 1;

        return {
          videoId: request.videoId,
          filePath: request.outputPath,
          durationSeconds: 2
        };
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

interface SeedOptions {
  videoId?: string;
  fileStatus?: TrackFileStatus;
  filePath?: string | null;
  thumbnailUrl?: string | null;
  skipNonMusic?: boolean;
  durationSeconds?: number | null;
}

interface Seeded {
  pangolinUserId: string;
  accountId: string;
  playlistId: string;
  trackId: string;
  videoId: string;
}

function seed(
  database: DatabaseHandle,
  options: SeedOptions = {},
  pangolinUserId = 'owner-1'
): Seeded {
  const account = seedAccount(database, { pangolinUserId });
  const playlist = seedPlaylist(database, account.accountId);
  const videoId = options.videoId ?? 'aaaaaaaaaaa';

  const track = seedTrack(database, {
    videoId,
    durationSeconds: options.durationSeconds ?? null,
    skipNonMusic: options.skipNonMusic,
    thumbnailUrl: options.thumbnailUrl,
    fileStatus: options.fileStatus ?? TrackFileStatus.Pending,
    filePath: options.filePath
  });

  associate(database, playlist.playlistId, track.trackId);

  return {
    pangolinUserId: account.pangolinUserId,
    accountId: account.accountId,
    playlistId: playlist.playlistId,
    trackId: track.trackId,
    videoId: track.videoId
  };
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

function run(
  youtube: IYoutubeClient,
  concurrency = 1,
  events = new EventBus<LiveEvent>()
) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return processPendingTracks(
    {
      database: context.database,
      mediaPaths: context.mediaPaths,
      youtube,
      events
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

  it('fails one invalid id without rejecting the pass', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    const invalid = seed(context.database, { videoId: '../escape' });
    const valid = seed(context.database, { videoId: 'aaaaaaaaaaa' }, 'owner-2');

    await expect(run(fake.youtube, 2)).resolves.toBeUndefined();

    expect(trackRow(valid.trackId)?.fileStatus).toBe(TrackFileStatus.Stored);
    expect(trackRow(invalid.trackId)?.fileStatus).toBe(TrackFileStatus.Failed);
    expect(fake.downloads).toEqual(['aaaaaaaaaaa']);
  });

  it('does not start the same download twice', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);
    await run(fake.youtube);

    expect(fake.downloads).toEqual([seeded.videoId]);
  });

  it('passes the policy recorded on the row to the adapter', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    seed(context.database, {
      videoId: 'aaaaaaaaaaa',
      skipNonMusic: false
    });

    await run(fake.youtube);

    // The worker has no playlist in scope, so the value comes from the track.
    expect(fake.requests[0]?.skipNonMusic).toBe(false);
  });

  it('writes the duration the adapter reports, not the source duration', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, {
      videoId: 'aaaaaaaaaaa',
      // What the source metadata said when the row was created.
      durationSeconds: 180
    });

    await run(fake.youtube);

    // The finished file is the truth; the fake reports two seconds for it.
    expect(trackRow(seeded.trackId)?.durationSeconds).toBe(2);
  });

  it('leaves the duration alone when the download fails', async () => {
    const fake = fakeDownloader({
      failTimes: 1,
      error: new Error('the download failed')
    });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, {
      videoId: 'aaaaaaaaaaa',
      durationSeconds: 180
    });

    await run(fake.youtube);

    const row = trackRow(seeded.trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Failed);
    // No probe ran, so no file duration was written and the row keeps its
    // source value.
    expect(row?.durationSeconds).toBe(180);
  });

  it('returns a track to pending when the fetch is interrupted', async () => {
    const fake = fakeDownloader({
      failTimes: 1,
      error: new EgressStreamError()
    });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);

    const row = trackRow(seeded.trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Pending);
    expect(row?.failureReason).toBeNull();
  });

  it('returns a track to pending when every exit is failed', async () => {
    const fake = fakeDownloader({
      failTimes: 1,
      error: new EgressCircuitOpenError()
    });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);

    expect(trackRow(seeded.trackId)?.fileStatus).toBe(TrackFileStatus.Pending);
    expect(trackRow(seeded.trackId)?.failureReason).toBeNull();
  });

  it('returns a track to pending when the exit refuses the download', async () => {
    const fake = fakeDownloader({
      failTimes: 1,
      error: new EgressSourceUnavailableError('blocked')
    });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);

    expect(trackRow(seeded.trackId)?.fileStatus).toBe(TrackFileStatus.Pending);
    expect(trackRow(seeded.trackId)?.failureReason).toBeNull();
  });

  it('returns a track to pending when the switch itself fails', async () => {
    const fake = fakeDownloader({
      failTimes: 1,
      error: new EgressSwitchFailedError(
        'The WireGuard interface could not be updated.'
      )
    });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);

    expect(trackRow(seeded.trackId)?.fileStatus).toBe(TrackFileStatus.Pending);
    expect(trackRow(seeded.trackId)?.failureReason).toBeNull();
  });

  it('fetches a track whole after the route flips its policy', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, {
      videoId: 'aaaaaaaaaaa',
      fileStatus: TrackFileStatus.Failed,
      skipNonMusic: true
    });

    const response = await context.app.inject({
      method: 'POST',
      url: `/api/v1/tracks/${seeded.trackId}/fetch-whole`,
      headers: {
        'remote-user': seeded.pangolinUserId,
        'x-playliberty-client': 'test'
      },
      payload: {}
    });
    expect(response.statusCode).toBe(200);

    await run(fake.youtube);

    // The route set the row false, so the worker asks the adapter for no cut.
    expect(fake.requests[0]?.skipNonMusic).toBe(false);
    expect(trackRow(seeded.trackId)?.fileStatus).toBe(TrackFileStatus.Stored);
  });

  it('never claims a stored track and serves it to a second association', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, {
      videoId: 'aaaaaaaaaaa',
      skipNonMusic: false
    });

    await run(fake.youtube);
    expect(fake.downloads).toEqual([seeded.videoId]);

    // A second account associates the same track row. Its playlist is on, but
    // the track keeps the policy of the fetch that stored it: first-wins.
    const otherAccount = seedAccount(context.database, {
      pangolinUserId: 'owner-2'
    });
    const otherPlaylist = seedPlaylist(
      context.database,
      otherAccount.accountId
    );
    context.database.db
      .insert(associations)
      .values({
        id: randomUUID(),
        playlistId: otherPlaylist.playlistId,
        trackId: seeded.trackId,
        origin: AssociationOrigin.Remote,
        position: 0
      })
      .run();

    fake.downloads.length = 0;
    await run(fake.youtube);

    expect(fake.downloads).toEqual([]);
    expect(trackRow(seeded.trackId)?.skipNonMusic).toBe(false);

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
    expect(row?.failureKind).toBe(FailureKind.Unknown);
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

  it('treats a SponsorBlock failure as retryable, not a gone video', async () => {
    const fake = fakeDownloader({
      failTimes: 1,
      error: new YoutubeSponsorBlockError('aaaaaaaaaaa')
    });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    await run(fake.youtube);

    const row = trackRow(seeded.trackId);
    expect(row?.fileStatus).toBe(TrackFileStatus.Failed);
    // Not terminal: the source is still there, so the next sync retries it.
    expect(row?.sourceStatus).toBe(TrackSourceStatus.Available);
    expect(row?.failureKind).toBe(FailureKind.Unknown);
    expect(row?.failureReason).toBe(SPONSORBLOCK_FAILURE_REASON);

    // A later pass does not retry it on its own; the next sync does.
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
        return {
          videoId: request.videoId,
          filePath: request.outputPath,
          durationSeconds: 2
        };
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
        youtube,
        events: new EventBus<LiveEvent>()
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
        return {
          videoId: request.videoId,
          filePath: request.outputPath,
          durationSeconds: 2
        };
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
        youtube,
        events: new EventBus<LiveEvent>()
      },
      concurrency: 1,
      logger: context.app.log,
      // An interval far longer than the test, so the only pass that can run is
      // the immediate one.
      intervalMs: 60_000
    });

    // No `started` gate: the row is stored before any interval could fire.
    await vi.waitFor(() => {
      expect(trackRow(seeded.trackId)?.fileStatus).toBe(TrackFileStatus.Stored);
    });

    expect(downloads).toEqual([seeded.videoId]);
  });

  it('publishes a track change when it claims and when it stores', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    const events = new EventBus<LiveEvent>();
    const received: LiveEvent[] = [];
    events.subscribe(seeded.accountId, event => received.push(event));

    await run(fake.youtube, 1, events);

    expect(received).toEqual([
      { type: LiveEventType.TrackChanged, playlistIds: [seeded.playlistId] },
      { type: LiveEventType.TrackChanged, playlistIds: [seeded.playlistId] }
    ]);
  });

  it('publishes a track change when a download fails', async () => {
    const fake = fakeDownloader({ failTimes: 1 });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    const events = new EventBus<LiveEvent>();
    const received: LiveEvent[] = [];
    events.subscribe(seeded.accountId, event => received.push(event));

    await run(fake.youtube, 1, events);

    expect(received).toHaveLength(2);
    expect(trackRow(seeded.trackId)?.fileStatus).toBe(TrackFileStatus.Failed);
  });

  it('publishes a track change when a video is gone', async () => {
    const fake = fakeDownloader({
      failTimes: 1,
      error: new YoutubeVideoUnavailableError('aaaaaaaaaaa')
    });
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });

    const events = new EventBus<LiveEvent>();
    const received: LiveEvent[] = [];
    events.subscribe(seeded.accountId, event => received.push(event));

    await run(fake.youtube, 1, events);

    expect(received).toHaveLength(2);
    expect(trackRow(seeded.trackId)?.sourceStatus).toBe(
      TrackSourceStatus.Removed
    );
  });

  it('publishes a track change to a collaborator and not to a stranger', async () => {
    const fake = fakeDownloader();
    context = await createTestContext({}, { youtube: fake.youtube });
    const seeded = seed(context.database, { videoId: 'aaaaaaaaaaa' });
    const collaborator = seedAccount(context.database, {
      pangolinUserId: 'collaborator-1'
    });
    const stranger = seedAccount(context.database, {
      pangolinUserId: 'stranger-1'
    });
    seedShare(context.database, seeded.playlistId, collaborator.accountId);

    const events = new EventBus<LiveEvent>();
    const collaboratorEvents: LiveEvent[] = [];
    const strangerEvents: LiveEvent[] = [];
    events.subscribe(collaborator.accountId, event =>
      collaboratorEvents.push(event)
    );
    events.subscribe(stranger.accountId, event => strangerEvents.push(event));

    await run(fake.youtube, 1, events);

    expect(collaboratorEvents).toHaveLength(2);
    expect(strangerEvents).toEqual([]);
  });
});
