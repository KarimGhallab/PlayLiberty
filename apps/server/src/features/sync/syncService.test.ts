import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AssociationOrigin,
  PlaylistSchema,
  PlaylistSyncStatus,
  Provider,
  SyncRunSchema,
  SyncRunStatus,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import type { SyncRun } from '@playliberty/contracts';

import { createTestContext } from '../../app/testing/createTestContext.js';
import type { TestContext } from '../../app/testing/createTestContext.js';
import {
  TEST_SOURCE_ID,
  testEntry as entry,
  createFakeYoutube as fakeYoutube,
  testSource as source
} from '../../app/testing/fakeYoutube.js';

import { associations, tracks } from '../../platform/database/schema.js';

const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PL1234567890abcdef';
const PLAYLIST_ID = TEST_SOURCE_ID;

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
