import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AssociationOrigin,
  Provider,
  TrackFileStatus,
  TrackSourceStatus,
  UserRole
} from '@playliberty/contracts';
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
import { mediaRelativePath } from '../../platform/media/mediaPaths.js';
import { processPendingTracks } from './downloadWorker.js';

let context: TestContext | undefined;

afterEach(async () => {
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
function fakeDownloader(): { youtube: IYoutubeClient; downloads: string[] } {
  const downloads: string[] = [];

  return {
    downloads,
    youtube: {
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

function run(youtube: IYoutubeClient) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return processPendingTracks(
    {
      database: context.database,
      mediaPaths: context.mediaPaths,
      youtube
    },
    context.app.log
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
});
