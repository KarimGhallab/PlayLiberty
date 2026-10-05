import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { and, eq, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SyncRun } from '@playliberty/contracts';
import {
  AssociationOrigin,
  PlaylistSchema,
  PlaylistSyncStatus,
  Provider,
  ShareLevel,
  SyncRunSchema,
  SyncRunStatus,
  TrackFileStatus,
  TrackSourceStatus,
  UserRole,
  createPageSchema
} from '@playliberty/contracts';
import type {
  DownloadTrackRequest,
  DownloadTrackResult,
  IYoutubeClient,
  YoutubeSource
} from '@playliberty/youtube';
import {
  SPONSORBLOCK_FAILURE_REASON,
  YoutubeSponsorBlockError
} from '@playliberty/youtube';

import type { TestContext } from '../../app/testing/createTestContext.js';
import { createTestContext } from '../../app/testing/createTestContext.js';
import {
  TEST_SOURCE_ID,
  testEntry as entry,
  createFakeYoutube as fakeYoutube,
  testSource as source
} from '../../app/testing/fakeYoutube.js';

import {
  accounts,
  associations,
  shares,
  suppressions,
  tracks
} from '../../platform/database/schema.js';
import { mediaRelativePath } from '../../platform/media/mediaPaths.js';
import { processPendingTracks } from '../downloads/downloadWorker.js';
import { removeAssociation } from '../playlists/associationService.js';

const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PL1234567890abcdef';
const PLAYLIST_ID = TEST_SOURCE_ID;
const PageSchema = createPageSchema(PlaylistSchema);

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

function post(
  url: string,
  pangolinUserId: string,
  extra: Record<string, unknown> = {}
) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'POST',
    url: '/api/v1/playlists',
    headers: { 'remote-user': pangolinUserId, 'x-playliberty-client': 'test' },
    payload: { url, ...extra }
  });
}

function get(url: string, pangolinUserId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'GET',
    url,
    headers: { 'remote-user': pangolinUserId }
  });
}

/*
 * A client learns a run's outcome from the latest-run route, so that is where the
 * test reads it too. The fake adapter resolves immediately, so the background run
 * is finished by the first poll or two; the loop is a guard against a flake rather
 * than a delay.
 */
async function runFinished(
  playlistId: string,
  pangolinUserId: string
): Promise<SyncRun> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const response = await get(
      `/api/v1/playlists/${playlistId}/sync-runs/latest`,
      pangolinUserId
    );

    if (response.statusCode === 200) {
      const run = SyncRunSchema.parse(response.json());

      if (run.status !== SyncRunStatus.Running) {
        return run;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 0));
  }

  throw new Error('the sync run did not finish');
}

async function readPlaylist(playlistId: string, pangolinUserId: string) {
  return PlaylistSchema.parse(
    (await get(`/api/v1/playlists/${playlistId}`, pangolinUserId)).json()
  );
}

/*
 * The tracks read route is spec 03 and does not exist yet, so the per-track
 * effects of a sync are read from the database here. Everything the API already
 * exposes (the run's counts, the playlist's count, status and name) is asserted
 * through the API above this.
 */
function readAssociations(playlistId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database.db
    .select({
      videoId: tracks.videoId,
      fileStatus: tracks.fileStatus,
      sourceStatus: tracks.sourceStatus,
      skipNonMusic: tracks.skipNonMusic,
      origin: associations.origin,
      position: associations.position
    })
    .from(associations)
    .innerJoin(tracks, eq(associations.trackId, tracks.id))
    .where(eq(associations.playlistId, playlistId))
    .orderBy(associations.position)
    .all();
}

describe('POST /playlists', () => {
  it('creates one playlist named and covered from the source and answers 202 with a running run', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('a'), entry('b')])) }
    );

    const response = await post(PLAYLIST_URL, 'owner-1');

    expect(response.statusCode).toBe(202);
    const run = SyncRunSchema.parse(response.json());
    expect(run.status).toBe(SyncRunStatus.Running);

    const finished = await runFinished(run.playlistId, 'owner-1');
    expect(finished.status).toBe(SyncRunStatus.Completed);
    expect(finished.addedCount).toBe(2);

    const playlist = await readPlaylist(run.playlistId, 'owner-1');
    expect(playlist.name).toBe('Evening Jazz');
    expect(playlist.coverUrl).toBe('https://i.ytimg.com/vi/a/hq.jpg');
    expect(playlist.syncStatus).toBe(PlaylistSyncStatus.Idle);
    expect(playlist.lastSyncedAt).not.toBeNull();
    expect(playlist.trackCount).toBe(2);
    /* Skip non-music parts is on by default. */
    expect(playlist.skipNonMusic).toBe(true);
  });

  it('records the setting off when the create asks for it off', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('a')])) }
    );

    const run = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1', { skipNonMusic: false })).json()
    );

    const playlist = await readPlaylist(run.playlistId, 'owner-1');
    expect(playlist.skipNonMusic).toBe(false);
  });

  it('creates tracks carrying the syncing playlist value', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('a'), entry('b')])) }
    );

    const run = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1', { skipNonMusic: false })).json()
    );
    await runFinished(run.playlistId, 'owner-1');

    const rows = readAssociations(run.playlistId);
    expect(rows).toHaveLength(2);
    expect(rows.every(row => row.skipNonMusic === false)).toBe(true);
  });

  it('keeps the first paste value when the same source is pasted again', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('a')]), source([entry('a')])) }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1', { skipNonMusic: false })).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    // The second paste finds the owner's existing playlist and keeps its value:
    // the setting is frozen at the first creation, not re-chosen on each paste.
    const second = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(second.playlistId, 'owner-1');

    expect(second.playlistId).toBe(first.playlistId);
    const playlist = await readPlaylist(first.playlistId, 'owner-1');
    expect(playlist.skipNonMusic).toBe(false);
  });

  it('kicks the download worker when the sync queued tracks', async () => {
    const kick = vi.fn();
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(source([entry('a'), entry('b')])),
        kickDownloads: kick
      }
    );

    const run = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(run.playlistId, 'owner-1');

    // Two tracks were queued, so the worker was woken rather than left until its
    // next interval.
    expect(kick).toHaveBeenCalledTimes(1);
  });

  it('does not kick the worker when the sync queued nothing', async () => {
    const kick = vi.fn();
    const fake = fakeYoutube(source([entry('a')]), source([entry('a')]));
    context = await createTestContext(
      {},
      { youtube: fake, kickDownloads: kick }
    );

    // The first sync adds the track and kicks; the spy is cleared after it so the
    // second sync is what is measured.
    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');
    kick.mockClear();

    await post(PLAYLIST_URL, 'owner-1');
    await runFinished(first.playlistId, 'owner-1');

    // The second sync found the same video already associated, so it queued
    // nothing and there is no work to start.
    expect(kick).not.toHaveBeenCalled();
  });

  it('creates one pending remote association per video, in source order', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('a'), entry('b'), entry('c')])) }
    );

    const run = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(run.playlistId, 'owner-1');

    const rows = readAssociations(run.playlistId);

    expect(rows.map(row => row.videoId)).toEqual(['a', 'b', 'c']);
    expect(rows.map(row => row.position)).toEqual([0, 1, 2]);
    expect(rows.every(row => row.origin === AssociationOrigin.Remote)).toBe(
      true
    );
    expect(rows.every(row => row.fileStatus === TrackFileStatus.Pending)).toBe(
      true
    );
    expect(
      rows.every(row => row.sourceStatus === TrackSourceStatus.Available)
    ).toBe(true);
  });

  it('stores the source thumbnail URL on the track it creates', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('aaaaaaaaaaa')])) }
    );

    const run = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(run.playlistId, 'owner-1');

    expect(trackByVideoId('aaaaaaaaaaa')?.thumbnailUrl).toBe(
      'https://i.ytimg.com/vi/aaaaaaaaaaa/hq.jpg'
    );
  });

  it('associates a video the instance already holds without a second track', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('a'), entry('b')]),
          source([entry('a'), entry('c')])
        )
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    const second = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-2')).json()
    );
    await runFinished(second.playlistId, 'owner-2');

    const firstRows = readAssociations(first.playlistId);
    const secondRows = readAssociations(second.playlistId);

    expect(firstRows.map(row => row.videoId)).toEqual(['a', 'b']);
    expect(secondRows.map(row => row.videoId)).toEqual(['a', 'c']);

    // One track row for 'a', shared by both playlists. The count of rows in
    // `track` is the fact; a second row would be a second download later.
    const trackRows = context.database.db
      .select({ videoId: tracks.videoId })
      .from(tracks)
      .where(eq(tracks.videoId, 'a'))
      .all();
    expect(trackRows).toHaveLength(1);
  });

  it('names the playlist after its source id when the source has no usable title', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('a')], { title: '   ' })) }
    );

    const run = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(run.playlistId, 'owner-1');

    const playlist = await readPlaylist(run.playlistId, 'owner-1');
    expect(playlist.name).toBe(PLAYLIST_ID);
  });

  it('lets two owners hold the same source without collision', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(source([entry('a')]), source([entry('a')]))
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    const second = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-2')).json()
    );
    await runFinished(second.playlistId, 'owner-2');

    expect(second.playlistId).not.toBe(first.playlistId);

    const mine = PlaylistSchema.parse(
      (await get(`/api/v1/playlists/${first.playlistId}`, 'owner-1')).json()
    );
    const theirs = PlaylistSchema.parse(
      (await get(`/api/v1/playlists/${second.playlistId}`, 'owner-2')).json()
    );

    expect(mine.sourcePlaylistId).toBe(PLAYLIST_ID);
    expect(theirs.sourcePlaylistId).toBe(PLAYLIST_ID);
    expect(mine.ownerAccountId).not.toBe(theirs.ownerAccountId);
    expect(theirs.provider).toBe(Provider.Youtube);
  });

  it('refuses a URL that is not a YouTube playlist or video', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('a')])) }
    );

    const response = await post('https://example.com/not-youtube', 'owner-1');

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'invalid_request',
      detail:
        'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
    });
  });

  it('refuses a mutation without the client header', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('a')])) }
    );

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/v1/playlists',
      headers: { 'remote-user': 'owner-1' },
      payload: { url: PLAYLIST_URL }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'csrf_header_missing' });
  });
});

function postSync(playlistId: string, pangolinUserId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'POST',
    url: `/api/v1/playlists/${playlistId}/sync`,
    headers: {
      'remote-user': pangolinUserId,
      'x-playliberty-client': 'test'
    }
  });
}

function readTrackTitle(videoId: string): string | undefined {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database.db
    .select({ title: tracks.title })
    .from(tracks)
    .where(eq(tracks.videoId, videoId))
    .get()?.title;
}

describe('POST /playlists/:id/sync', () => {
  it('answers 202 with a run in running and leaves an unchanged source alone', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('a'), entry('b')]),
          source([entry('a'), entry('b')])
        )
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    const response = await postSync(first.playlistId, 'owner-1');

    expect(response.statusCode).toBe(202);
    const run = SyncRunSchema.parse(response.json());
    expect(run.status).toBe(SyncRunStatus.Running);

    const finished = await runFinished(first.playlistId, 'owner-1');
    expect(finished.status).toBe(SyncRunStatus.Completed);
    expect(finished.addedCount).toBe(0);

    const playlist = await readPlaylist(first.playlistId, 'owner-1');
    expect(playlist.trackCount).toBe(2);
  });

  it('appends a new video and leaves an associated one exactly as it is', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('a'), entry('b')]),
          source([
            { ...entry('a'), title: 'Renamed a' },
            entry('b'),
            entry('c')
          ])
        )
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    await postSync(first.playlistId, 'owner-1');
    await runFinished(first.playlistId, 'owner-1');

    const rows = readAssociations(first.playlistId);

    expect(rows.map(row => row.videoId)).toEqual(['a', 'b', 'c']);
    expect(rows.map(row => row.position)).toEqual([0, 1, 2]);
    // The second read named 'a' differently. The track keeps the metadata it was
    // created with, which is what "left exactly as it is" means.
    expect(readTrackTitle('a')).toBe('Track a');
  });

  it('re-pasting a source the caller already synced returns the existing playlist', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(source([entry('a')]), source([entry('a')]))
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    const second = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );

    expect(second.playlistId).toBe(first.playlistId);

    await runFinished(first.playlistId, 'owner-1');
    const page = PageSchema.parse(
      (await get('/api/v1/playlists', 'owner-1')).json()
    );
    expect(page.total).toBe(1);
  });

  it('refuses a second sync while one is in flight with 409', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const gated: IYoutubeClient = {
      listSource: async () => {
        await gate;
        return source([entry('a')]);
      },
      downloadTrack: async () => {
        throw new Error('a sync must not download');
      },
      fetchThumbnail: async () => {
        throw new Error('a sync must not fetch a thumbnail');
      }
    };

    context = await createTestContext({}, { youtube: gated });

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    expect(first.status).toBe(SyncRunStatus.Running);

    const conflict = await postSync(first.playlistId, 'owner-1');

    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({ code: 'sync_already_running' });

    release();
    await runFinished(first.playlistId, 'owner-1');
  });

  it('refuses a caller who cannot write the playlist', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('a')])) }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    const response = await postSync(first.playlistId, 'owner-2');

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'playlist_not_found' });
  });
});

function trackByVideoId(videoId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database.db
    .select()
    .from(tracks)
    .where(eq(tracks.videoId, videoId))
    .get();
}

function associationCount(videoId: string): number {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  const row = context.database.db
    .select({ total: sql<number>`count(*)` })
    .from(associations)
    .innerJoin(tracks, eq(associations.trackId, tracks.id))
    .where(eq(tracks.videoId, videoId))
    .get();

  return row?.total ?? 0;
}

/*
 * A synced track arrives `pending`, so a test about retaining a file has to put
 * one there first. The bytes are written where the static handler will look for
 * the stored path, so the stream route really serves them rather than merely
 * agreeing that a path exists.
 */
async function storeTrack(trackId: string, videoId: string): Promise<void> {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  const relativePath = mediaRelativePath(videoId, '.m4a');
  const absolutePath = join(context.directory, 'media', relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, 'stored-audio');

  context.database.db
    .update(tracks)
    .set({ fileStatus: TrackFileStatus.Stored, filePath: relativePath })
    .where(eq(tracks.id, trackId))
    .run();
}

function stream(trackId: string, pangolinUserId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'GET',
    url: `/api/v1/tracks/${trackId}/stream`,
    headers: { 'remote-user': pangolinUserId }
  });
}

describe('retaining a track whose source video is gone', () => {
  it('marks a stored track remote-removed, keeps its file, counts it, and still streams', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('aaaaaaaaaaa'), entry('bbbbbbbbbbb')]),
          source([entry('bbbbbbbbbbb')])
        )
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    const stored = trackByVideoId('aaaaaaaaaaa');
    expect(stored).toBeDefined();
    await storeTrack(stored?.id ?? '', 'aaaaaaaaaaa');

    await postSync(first.playlistId, 'owner-1');
    const finished = await runFinished(first.playlistId, 'owner-1');

    expect(finished.retainedCount).toBe(1);
    expect(finished.removedCount).toBe(0);

    const retained = trackByVideoId('aaaaaaaaaaa');
    expect(retained?.sourceStatus).toBe(TrackSourceStatus.Removed);
    expect(retained?.fileStatus).toBe(TrackFileStatus.Stored);
    expect(retained?.filePath).not.toBeNull();

    const response = await stream(retained?.id ?? '', 'owner-1');
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('stored-audio');
  });

  it('makes a track that left before it was downloaded unavailable rather than pending', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('aaaaaaaaaaa'), entry('bbbbbbbbbbb')]),
          source([entry('bbbbbbbbbbb')])
        )
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    await postSync(first.playlistId, 'owner-1');
    const finished = await runFinished(first.playlistId, 'owner-1');

    const gone = trackByVideoId('aaaaaaaaaaa');
    expect(gone?.fileStatus).toBe(TrackFileStatus.Unavailable);
    expect(gone?.sourceStatus).toBe(TrackSourceStatus.Removed);
    // Nothing was retained, because there was no file to keep.
    expect(finished.retainedCount).toBe(0);
  });

  it('reads remote-removed in every playlist that holds the track', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('aaaaaaaaaaa')]),
          source([entry('aaaaaaaaaaa')]),
          source([])
        )
      }
    );

    const mine = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(mine.playlistId, 'owner-1');

    const theirs = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-2')).json()
    );
    await runFinished(theirs.playlistId, 'owner-2');

    // One shared track, two associations.
    expect(associationCount('aaaaaaaaaaa')).toBe(2);

    await postSync(mine.playlistId, 'owner-1');
    await runFinished(mine.playlistId, 'owner-1');

    // The flag lives on the track, so both playlists read the same answer.
    const shared = trackByVideoId('aaaaaaaaaaa');
    expect(shared?.sourceStatus).toBe(TrackSourceStatus.Removed);
    expect(associationCount('aaaaaaaaaaa')).toBe(2);

    const other = await readPlaylist(theirs.playlistId, 'owner-2');
    expect(other.trackCount).toBe(1);
  });
});

function suppressionCount(playlistId: string): number {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  const row = context.database.db
    .select({ total: sql<number>`count(*)` })
    .from(suppressions)
    .where(eq(suppressions.playlistId, playlistId))
    .get();

  return row?.total ?? 0;
}

function suppress(playlistId: string, videoId: string): void {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  context.database.db
    .insert(suppressions)
    .values({ playlistId, videoId })
    .run();
}

function liftSuppression(playlistId: string, videoId: string): void {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  context.database.db
    .delete(suppressions)
    .where(
      and(
        eq(suppressions.playlistId, playlistId),
        eq(suppressions.videoId, videoId)
      )
    )
    .run();
}

describe('honouring a suppression', () => {
  it('does not associate a video the playlist has a suppression for', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('bbbbbbbbbbb')]),
          source([entry('aaaaaaaaaaa'), entry('bbbbbbbbbbb')])
        )
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    // The writer is spec 04 (removing a track). Until it lands, a suppression is
    // seeded, which is the only way to put the database in the state it describes.
    suppress(first.playlistId, 'aaaaaaaaaaa');

    await postSync(first.playlistId, 'owner-1');
    await runFinished(first.playlistId, 'owner-1');

    expect(associationCount('aaaaaaaaaaa')).toBe(0);
    expect(trackByVideoId('aaaaaaaaaaa')).toBeUndefined();
    expect(associationCount('bbbbbbbbbbb')).toBe(1);
    // The reconcile leaves a suppression whose video the source still lists.
    expect(suppressionCount(first.playlistId)).toBe(1);
  });

  it('associates a suppressed video again once its suppression is gone', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('bbbbbbbbbbb')]),
          source([entry('aaaaaaaaaaa'), entry('bbbbbbbbbbb')]),
          source([entry('aaaaaaaaaaa'), entry('bbbbbbbbbbb')])
        )
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    suppress(first.playlistId, 'aaaaaaaaaaa');
    await postSync(first.playlistId, 'owner-1');
    await runFinished(first.playlistId, 'owner-1');
    expect(associationCount('aaaaaaaaaaa')).toBe(0);

    liftSuppression(first.playlistId, 'aaaaaaaaaaa');
    await postSync(first.playlistId, 'owner-1');
    await runFinished(first.playlistId, 'owner-1');

    expect(associationCount('aaaaaaaaaaa')).toBe(1);
  });

  it('creates no suppression of its own', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('aaaaaaaaaaa')])) }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    await postSync(first.playlistId, 'owner-1');
    await runFinished(first.playlistId, 'owner-1');

    expect(suppressionCount(first.playlistId)).toBe(0);
  });
});

describe('lifting a suppression', () => {
  it('lifts a suppression once the source no longer lists the video', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('aaaaaaaaaaa'), entry('bbbbbbbbbbb')]),
          source([entry('bbbbbbbbbbb')])
        )
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    // The listener removes the track while the source still lists it.
    expect(
      removeAssociation(context.database, {
        playlistId: first.playlistId,
        trackId: trackByVideoId('aaaaaaaaaaa')?.id ?? ''
      })
    ).toBe('removed');
    expect(suppressionCount(first.playlistId)).toBe(1);

    // The source then drops the video, so the removal has nothing left to hold
    // against and the suppression is lifted.
    await postSync(first.playlistId, 'owner-1');
    await runFinished(first.playlistId, 'owner-1');

    expect(suppressionCount(first.playlistId)).toBe(0);
    expect(associationCount('aaaaaaaaaaa')).toBe(0);
  });

  it('associates a video again after it left the source and returned', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('aaaaaaaaaaa'), entry('bbbbbbbbbbb')]),
          source([entry('bbbbbbbbbbb')]),
          source([entry('aaaaaaaaaaa'), entry('bbbbbbbbbbb')])
        )
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    removeAssociation(context.database, {
      playlistId: first.playlistId,
      trackId: trackByVideoId('aaaaaaaaaaa')?.id ?? ''
    });

    // The source drops the video: the suppression is lifted.
    await postSync(first.playlistId, 'owner-1');
    await runFinished(first.playlistId, 'owner-1');
    expect(suppressionCount(first.playlistId)).toBe(0);
    expect(associationCount('aaaaaaaaaaa')).toBe(0);

    // The video comes back, and there is nothing left to suppress it.
    await postSync(first.playlistId, 'owner-1');
    await runFinished(first.playlistId, 'owner-1');

    expect(associationCount('aaaaaaaaaaa')).toBe(1);
  });

  it('keeps a removed track removed while the source still lists it', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('aaaaaaaaaaa'), entry('bbbbbbbbbbb')]),
          source([entry('aaaaaaaaaaa'), entry('bbbbbbbbbbb')])
        )
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    removeAssociation(context.database, {
      playlistId: first.playlistId,
      trackId: trackByVideoId('aaaaaaaaaaa')?.id ?? ''
    });

    await postSync(first.playlistId, 'owner-1');
    await runFinished(first.playlistId, 'owner-1');

    // The source still lists it, so the suppression holds and it stays removed.
    expect(associationCount('aaaaaaaaaaa')).toBe(0);
    expect(suppressionCount(first.playlistId)).toBe(1);
  });
});

/*
 * The queue-flavoured fake answers every read from a list of sources; this one
 * takes a script of sources and errors, so a test can say exactly which read
 * fails and which succeeds.
 */
function scriptedYoutube(script: (YoutubeSource | Error)[]): IYoutubeClient {
  let index = 0;

  return {
    listSource: async (): Promise<YoutubeSource> => {
      const step = script[index];
      index += 1;

      if (step === undefined) {
        throw new Error('the script is exhausted');
      }

      if (step instanceof Error) {
        throw step;
      }

      return step;
    },
    downloadTrack: async (): Promise<never> => {
      throw new Error('a sync must not download');
    },
    fetchThumbnail: async (): Promise<never> => {
      throw new Error('a sync must not fetch a thumbnail');
    }
  };
}

describe('a failed sync changes nothing', () => {
  it('yields a failed run with an error and leaves the playlist in error', async () => {
    context = await createTestContext(
      {},
      {
        youtube: scriptedYoutube([
          source([entry('aaaaaaaaaaa'), entry('bbbbbbbbbbb')]),
          new Error('YouTube is unreachable')
        ])
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    const before = readAssociations(first.playlistId);

    await postSync(first.playlistId, 'owner-1');
    const failed = await runFinished(first.playlistId, 'owner-1');

    expect(failed.status).toBe(SyncRunStatus.Failed);
    expect(failed.error).toBe('YouTube is unreachable');
    expect(failed.addedCount).toBe(0);
    expect(failed.retainedCount).toBe(0);

    const playlist = await readPlaylist(first.playlistId, 'owner-1');
    expect(playlist.syncStatus).toBe(PlaylistSyncStatus.Error);
    expect(playlist.lastSyncedAt).not.toBeNull();
    expect(playlist.trackCount).toBe(2);

    // Nothing moved: the same rows, the same positions, still available.
    const after = readAssociations(first.playlistId);
    expect(after).toEqual(before);
    expect(
      after.every(row => row.sourceStatus === TrackSourceStatus.Available)
    ).toBe(true);
  });

  it('reconciles normally on the next sync after a failure', async () => {
    context = await createTestContext(
      {},
      {
        youtube: scriptedYoutube([
          source([entry('aaaaaaaaaaa')]),
          new Error('YouTube is unreachable'),
          source([entry('aaaaaaaaaaa'), entry('bbbbbbbbbbb')])
        ])
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    await postSync(first.playlistId, 'owner-1');
    const failed = await runFinished(first.playlistId, 'owner-1');
    expect(failed.status).toBe(SyncRunStatus.Failed);

    await postSync(first.playlistId, 'owner-1');
    const recovered = await runFinished(first.playlistId, 'owner-1');

    expect(recovered.status).toBe(SyncRunStatus.Completed);
    expect(recovered.addedCount).toBe(1);
    expect(associationCount('bbbbbbbbbbb')).toBe(1);

    const playlist = await readPlaylist(first.playlistId, 'owner-1');
    expect(playlist.syncStatus).toBe(PlaylistSyncStatus.Idle);
    expect(playlist.trackCount).toBe(2);
  });

  it('does not treat a failure as an empty source', async () => {
    context = await createTestContext(
      {},
      {
        youtube: scriptedYoutube([
          source([entry('aaaaaaaaaaa')]),
          new Error('YouTube is unreachable'),
          source([])
        ])
      }
    );

    const first = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(first.playlistId, 'owner-1');

    await postSync(first.playlistId, 'owner-1');
    await runFinished(first.playlistId, 'owner-1');
    // The failure left the track alone.
    expect(trackByVideoId('aaaaaaaaaaa')?.sourceStatus).toBe(
      TrackSourceStatus.Available
    );

    await postSync(first.playlistId, 'owner-1');
    await runFinished(first.playlistId, 'owner-1');
    // An empty source, by contrast, is a real reading and retires the track.
    expect(trackByVideoId('aaaaaaaaaaa')?.sourceStatus).toBe(
      TrackSourceStatus.Removed
    );
  });
});

describe('a single video source', () => {
  const videoId = 'dQw4w9WgXcQ';
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const videoEntry = { ...entry(videoId), title: 'A Song' };

  function videoSource() {
    return source([videoEntry], { title: 'A Song', sourceId: videoId });
  }

  it('creates a one-track Synced playlist whose source is that video', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(videoSource()) }
    );

    const started = SyncRunSchema.parse(
      (await post(videoUrl, 'owner-1')).json()
    );
    const finished = await runFinished(started.playlistId, 'owner-1');

    expect(finished.status).toBe(SyncRunStatus.Completed);
    expect(finished.addedCount).toBe(1);

    const playlist = await readPlaylist(started.playlistId, 'owner-1');
    expect(playlist.sourcePlaylistId).toBe(videoId);
    expect(playlist.name).toBe('A Song');
    expect(playlist.coverUrl).toBe(videoEntry.thumbnailUrl);
    expect(playlist.trackCount).toBe(1);

    const rows = readAssociations(started.playlistId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.videoId).toBe(videoId);
    expect(rows[0]?.origin).toBe(AssociationOrigin.Remote);
    expect(rows[0]?.position).toBe(0);
  });

  it('re-posting the same video URL returns the existing playlist', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(videoSource(), videoSource()) }
    );

    const first = SyncRunSchema.parse((await post(videoUrl, 'owner-1')).json());
    await runFinished(first.playlistId, 'owner-1');

    const second = SyncRunSchema.parse(
      (await post(videoUrl, 'owner-1')).json()
    );

    expect(second.playlistId).toBe(first.playlistId);

    await runFinished(first.playlistId, 'owner-1');
    const page = PageSchema.parse(
      (await get('/api/v1/playlists', 'owner-1')).json()
    );
    expect(page.total).toBe(1);
  });

  it('re-syncs a video playlist like any other', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(videoSource(), videoSource()) }
    );

    const started = SyncRunSchema.parse(
      (await post(videoUrl, 'owner-1')).json()
    );
    await runFinished(started.playlistId, 'owner-1');

    const response = await postSync(started.playlistId, 'owner-1');
    expect(response.statusCode).toBe(202);

    const finished = await runFinished(started.playlistId, 'owner-1');
    expect(finished.status).toBe(SyncRunStatus.Completed);
    expect(finished.addedCount).toBe(0);
    expect(associationCount(videoId)).toBe(1);
  });
});

function seedAccount(pangolinUserId: string): string {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  const id = randomUUID();

  context.database.db
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

/*
 * A share is seeded rather than created by a route: the three share routes are
 * still stubs (spec 05), so inserting the row is the only way to put the database
 * in the state a shared playlist is actually in.
 */
function sharePlaylist(
  playlistId: string,
  accountId: string,
  level: ShareLevel
): void {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  context.database.db
    .insert(shares)
    .values({ id: randomUUID(), playlistId, accountId, level })
    .run();
}

describe('authorizing a sync', () => {
  it('lets an owner and a write collaborator sync, and refuses a read collaborator like a stranger', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('aaaaaaaaaaa')]),
          source([entry('aaaaaaaaaaa')]),
          source([entry('aaaaaaaaaaa')])
        )
      }
    );

    const created = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(created.playlistId, 'owner-1');

    const writerId = seedAccount('writer-1');
    const readerId = seedAccount('reader-1');
    sharePlaylist(created.playlistId, writerId, ShareLevel.Write);
    sharePlaylist(created.playlistId, readerId, ShareLevel.Read);

    const writer = await postSync(created.playlistId, 'writer-1');
    expect(writer.statusCode).toBe(202);
    await runFinished(created.playlistId, 'writer-1');

    const owner = await postSync(created.playlistId, 'owner-1');
    expect(owner.statusCode).toBe(202);
    await runFinished(created.playlistId, 'owner-1');

    const reader = await postSync(created.playlistId, 'reader-1');
    expect(reader.statusCode).toBe(404);
    expect(reader.json()).toMatchObject({ code: 'playlist_not_found' });

    const stranger = await postSync(created.playlistId, 'stranger-1');
    expect(stranger.statusCode).toBe(404);
    expect(stranger.json()).toMatchObject({ code: 'playlist_not_found' });
  });

  it('lets any authenticated account create a playlist', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('aaaaaaaaaaa')])) }
    );

    const created = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'brand-new-account')).json()
    );
    expect(created.status).toBe(SyncRunStatus.Running);
    await runFinished(created.playlistId, 'brand-new-account');

    const mine = PageSchema.parse(
      (await get('/api/v1/playlists', 'brand-new-account')).json()
    );
    expect(mine.total).toBe(1);
    expect(mine.items[0]?.access).toBe('owner');

    const theirs = PageSchema.parse(
      (await get('/api/v1/playlists', 'somebody-else')).json()
    );
    expect(theirs.total).toBe(0);
  });

  it('refuses a sync without the client header', async () => {
    context = await createTestContext(
      {},
      { youtube: fakeYoutube(source([entry('aaaaaaaaaaa')])) }
    );

    const created = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(created.playlistId, 'owner-1');

    const response = await context.app.inject({
      method: 'POST',
      url: `/api/v1/playlists/${created.playlistId}/sync`,
      headers: { 'remote-user': 'owner-1' }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'csrf_header_missing' });
  });

  it('refuses a sync from a foreign origin when one is configured', async () => {
    context = await createTestContext(
      { PUBLIC_ORIGIN: 'https://app.example.com' },
      { youtube: fakeYoutube(source([entry('aaaaaaaaaaa')])) }
    );

    const response = await context.app.inject({
      method: 'POST',
      url: `/api/v1/playlists/${randomUUID()}/sync`,
      headers: {
        'remote-user': 'owner-1',
        'x-playliberty-client': 'test',
        origin: 'https://evil.example.com'
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'csrf_origin_mismatch' });
  });
});

/*
 * A fake that both reads a source and stores a file, for the end-to-end retry:
 * a sync creates the track, a fetch fails, the next sync re-queues it, and a
 * worker pass stores it. `failFirstWith` makes the first download fail with a
 * chosen typed error, so a test can drive the classification the worker records.
 */
function storingYoutube(
  options: { failFirstWith?: Error } = {},
  ...sources: YoutubeSource[]
): {
  youtube: IYoutubeClient;
  downloads: string[];
} {
  const queue = [...sources];
  const downloads: string[] = [];
  let failures = options.failFirstWith === undefined ? 0 : 1;

  return {
    downloads,
    youtube: {
      listSource: async (): Promise<YoutubeSource> => {
        const next = queue.shift();

        if (next === undefined) {
          throw new Error('the fake adapter has no source left to read');
        }

        return next;
      },
      downloadTrack: async (
        request: DownloadTrackRequest
      ): Promise<DownloadTrackResult> => {
        downloads.push(request.videoId);

        if (failures > 0 && options.failFirstWith !== undefined) {
          failures -= 1;
          throw options.failFirstWith;
        }

        await mkdir(dirname(request.outputPath), { recursive: true });
        await writeFile(request.outputPath, 'stored-audio');
        return {
          videoId: request.videoId,
          filePath: request.outputPath,
          durationSeconds: 2
        };
      },
      fetchThumbnail: async (): Promise<never> => {
        throw new Error('a retry test does not fetch a thumbnail');
      }
    }
  };
}

describe('retrying a failed download', () => {
  it('returns a failed track to pending on the next sync and then stores it', async () => {
    const fake = storingYoutube(
      {},
      source([entry('aaaaaaaaaaa')]),
      source([entry('aaaaaaaaaaa')])
    );
    context = await createTestContext({}, { youtube: fake.youtube });

    const created = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(created.playlistId, 'owner-1');

    const trackId = trackByVideoId('aaaaaaaaaaa')?.id ?? '';
    context.database.db
      .update(tracks)
      .set({ fileStatus: TrackFileStatus.Failed, failureReason: 'a failure' })
      .where(eq(tracks.id, trackId))
      .run();

    await postSync(created.playlistId, 'owner-1');
    await runFinished(created.playlistId, 'owner-1');

    // The sync returns it to pending and clears the stale reason.
    const retried = trackByVideoId('aaaaaaaaaaa');
    expect(retried?.fileStatus).toBe(TrackFileStatus.Pending);
    expect(retried?.failureReason).toBeNull();

    await processPendingTracks(
      {
        database: context.database,
        mediaPaths: context.mediaPaths,
        youtube: fake.youtube
      },
      context.app.log,
      1
    );

    const stored = trackByVideoId('aaaaaaaaaaa');
    expect(stored?.fileStatus).toBe(TrackFileStatus.Stored);
    expect(stored?.filePath).toBe(mediaRelativePath('aaaaaaaaaaa', '.m4a'));
  });

  it('classifies a SponsorBlock failure as retryable and stores it on the next sync', async () => {
    const fake = storingYoutube(
      { failFirstWith: new YoutubeSponsorBlockError('aaaaaaaaaaa') },
      source([entry('aaaaaaaaaaa')]),
      source([entry('aaaaaaaaaaa')])
    );
    context = await createTestContext({}, { youtube: fake.youtube });

    const created = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(created.playlistId, 'owner-1');

    // The first worker pass fails on the SponsorBlock lookup.
    await processPendingTracks(
      {
        database: context.database,
        mediaPaths: context.mediaPaths,
        youtube: fake.youtube
      },
      context.app.log,
      1
    );

    const failed = trackByVideoId('aaaaaaaaaaa');
    expect(failed?.fileStatus).toBe(TrackFileStatus.Failed);
    // Not a gone video: the source status stays available, so the sync retries it.
    expect(failed?.sourceStatus).toBe(TrackSourceStatus.Available);
    expect(failed?.failureReason).toBe(SPONSORBLOCK_FAILURE_REASON);

    // The next sync returns it to pending, and the next pass stores it.
    await postSync(created.playlistId, 'owner-1');
    await runFinished(created.playlistId, 'owner-1');
    expect(trackByVideoId('aaaaaaaaaaa')?.fileStatus).toBe(
      TrackFileStatus.Pending
    );

    await processPendingTracks(
      {
        database: context.database,
        mediaPaths: context.mediaPaths,
        youtube: fake.youtube
      },
      context.app.log,
      1
    );
    expect(trackByVideoId('aaaaaaaaaaa')?.fileStatus).toBe(
      TrackFileStatus.Stored
    );
  });
});

describe('a track whose video is gone', () => {
  it('is not returned to pending by a later sync', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(
          source([entry('aaaaaaaaaaa')]),
          source([entry('aaaaaaaaaaa')])
        )
      }
    );

    const created = SyncRunSchema.parse(
      (await post(PLAYLIST_URL, 'owner-1')).json()
    );
    await runFinished(created.playlistId, 'owner-1');

    const trackId = trackByVideoId('aaaaaaaaaaa')?.id ?? '';
    context.database.db
      .update(tracks)
      .set({
        fileStatus: TrackFileStatus.Unavailable,
        sourceStatus: TrackSourceStatus.Removed
      })
      .where(eq(tracks.id, trackId))
      .run();

    await postSync(created.playlistId, 'owner-1');
    await runFinished(created.playlistId, 'owner-1');

    const row = trackByVideoId('aaaaaaaaaaa');
    expect(row?.fileStatus).toBe(TrackFileStatus.Unavailable);
    expect(row?.sourceStatus).toBe(TrackSourceStatus.Removed);
  });
});
