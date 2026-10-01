import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { and, eq, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AssociationOrigin,
  PlaylistSchema,
  PlaylistSyncStatus,
  Provider,
  SyncRunSchema,
  SyncRunStatus,
  TrackFileStatus,
  TrackSourceStatus,
  createPageSchema
} from '@playliberty/contracts';
import type { SyncRun } from '@playliberty/contracts';
import type { IYoutubeClient, YoutubeSource } from '@playliberty/youtube';

import { createTestContext } from '../../app/testing/createTestContext.js';
import type { TestContext } from '../../app/testing/createTestContext.js';
import {
  TEST_SOURCE_ID,
  testEntry as entry,
  createFakeYoutube as fakeYoutube,
  testSource as source
} from '../../app/testing/fakeYoutube.js';

import {
  associations,
  suppressions,
  tracks
} from '../../platform/database/schema.js';
import { mediaRelativePath } from '../../platform/media/mediaPaths.js';

const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PL1234567890abcdef';
const PLAYLIST_ID = TEST_SOURCE_ID;
const PageSchema = createPageSchema(PlaylistSchema);

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

function post(url: string, pangolinUserId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'POST',
    url: '/api/v1/playlists',
    headers: { 'remote-user': pangolinUserId, 'x-playliberty-client': 'test' },
    payload: { url }
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
    expect(response.json()).toMatchObject({ code: 'invalid_request' });
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
    // The reconcile reads suppressions and never writes one.
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

  it('never writes a suppression of its own', async () => {
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
