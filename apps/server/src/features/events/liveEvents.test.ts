import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LiveEvent } from '@playliberty/contracts';
import {
  LiveEventType,
  ShareLevel,
  TrackFileStatus
} from '@playliberty/contracts';

import { publishTracksChangedForPlaylists } from '../../shared/events/liveEvents.js';

import type { TestContext } from '../../app/testing/createTestContext.js';
import { createTestContext } from '../../app/testing/createTestContext.js';
import { createFakeYoutube, testVideo } from '../../app/testing/fakeYoutube.js';
import {
  associate,
  seedAccount,
  seedPlaylist,
  seedShare,
  seedTrack
} from '../../app/testing/fixtures.js';

/*
 * Events the playlist and track features publish, observed on the context's
 * bus. Routes run through `inject`, so the real audience is what is tested.
 */

const VIDEO_URL = 'https://www.youtube.com/watch?v=bbbbbbbbbbb';

let context: TestContext | undefined;

afterEach(async () => {
  vi.restoreAllMocks();
  await context?.cleanup();
  context = undefined;
});

function request(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  pangolinUserId: string,
  payload?: Record<string, unknown>
) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method,
    url,
    headers: {
      'remote-user': pangolinUserId,
      'x-playliberty-client': 'test'
    },
    ...(payload === undefined ? {} : { payload })
  });
}

function collect(accountId: string): LiveEvent[] {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  const received: LiveEvent[] = [];
  context.events.subscribe(accountId, event => received.push(event));
  return received;
}

describe('the playlist and track events', () => {
  it('publishes a playlist change when a playlist is renamed', async () => {
    context = await createTestContext();
    const account = seedAccount(context.database, {
      pangolinUserId: 'owner-1'
    });
    const { playlistId } = seedPlaylist(context.database, account.accountId);
    const received = collect(account.accountId);

    const response = await request(
      'PATCH',
      `/api/v1/playlists/${playlistId}`,
      'owner-1',
      { name: 'Morning Jazz' }
    );

    expect(response.statusCode).toBe(200);
    expect(received).toEqual([
      { type: LiveEventType.PlaylistChanged, playlistId }
    ]);
  });

  it('publishes a rename to a collaborator and not to a stranger', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database, { pangolinUserId: 'owner-1' });
    const { playlistId } = seedPlaylist(context.database, owner.accountId);
    const collaborator = seedAccount(context.database, {
      pangolinUserId: 'collaborator-1'
    });
    const stranger = seedAccount(context.database, {
      pangolinUserId: 'stranger-1'
    });
    seedShare(context.database, playlistId, collaborator.accountId);
    const collaboratorEvents = collect(collaborator.accountId);
    const strangerEvents = collect(stranger.accountId);

    await request('PATCH', `/api/v1/playlists/${playlistId}`, 'owner-1', {
      name: 'Morning Jazz'
    });

    expect(collaboratorEvents).toEqual([
      { type: LiveEventType.PlaylistChanged, playlistId }
    ]);
    expect(strangerEvents).toEqual([]);
  });

  it('publishes a playlist removal to the owner and a collaborator', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database, { pangolinUserId: 'owner-1' });
    const { playlistId } = seedPlaylist(context.database, owner.accountId);
    const collaborator = seedAccount(context.database, {
      pangolinUserId: 'collaborator-1'
    });
    seedShare(context.database, playlistId, collaborator.accountId);
    const ownerEvents = collect(owner.accountId);
    const collaboratorEvents = collect(collaborator.accountId);

    const response = await request(
      'DELETE',
      `/api/v1/playlists/${playlistId}`,
      'owner-1'
    );

    expect(response.statusCode).toBe(204);
    expect(ownerEvents).toEqual([
      { type: LiveEventType.PlaylistRemoved, playlistId }
    ]);
    expect(collaboratorEvents).toEqual([
      { type: LiveEventType.PlaylistRemoved, playlistId }
    ]);
  });

  it('publishes a playlist change to the owner and the grantee when a share is granted', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database, { pangolinUserId: 'owner-1' });
    const { playlistId } = seedPlaylist(context.database, owner.accountId);
    const grantee = seedAccount(context.database, {
      pangolinUserId: 'grantee-1'
    });
    const ownerEvents = collect(owner.accountId);
    const granteeEvents = collect(grantee.accountId);

    const response = await request(
      'POST',
      `/api/v1/playlists/${playlistId}/shares`,
      'owner-1',
      { accountId: grantee.accountId, level: ShareLevel.Read }
    );

    expect(response.statusCode).toBe(200);
    expect(ownerEvents).toEqual([
      { type: LiveEventType.PlaylistChanged, playlistId }
    ]);
    expect(granteeEvents).toEqual([
      { type: LiveEventType.PlaylistChanged, playlistId }
    ]);
  });

  it('tells a revoked account the playlist is gone and the owner it changed', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database, { pangolinUserId: 'owner-1' });
    const { playlistId } = seedPlaylist(context.database, owner.accountId);
    const grantee = seedAccount(context.database, {
      pangolinUserId: 'grantee-1'
    });
    seedShare(context.database, playlistId, grantee.accountId);
    const ownerEvents = collect(owner.accountId);
    const granteeEvents = collect(grantee.accountId);

    const response = await request(
      'DELETE',
      `/api/v1/playlists/${playlistId}/shares/${grantee.accountId}`,
      'owner-1'
    );

    expect(response.statusCode).toBe(204);
    expect(granteeEvents).toEqual([
      { type: LiveEventType.PlaylistRemoved, playlistId }
    ]);
    expect(ownerEvents).toEqual([
      { type: LiveEventType.PlaylistChanged, playlistId }
    ]);
  });

  it('publishes a track change when a video is added to a playlist', async () => {
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(testVideo('bbbbbbbbbbb')) }
    );
    const account = seedAccount(context.database, {
      pangolinUserId: 'owner-1'
    });
    const { playlistId } = seedPlaylist(context.database, account.accountId);
    const received = collect(account.accountId);

    const response = await request('POST', '/api/v1/tracks', 'owner-1', {
      url: VIDEO_URL,
      playlistIds: [playlistId]
    });

    expect(response.statusCode).toBe(200);
    expect(received).toEqual([
      { type: LiveEventType.TrackChanged, playlistIds: [playlistId] }
    ]);
  });

  it('publishes a track change when a track is removed from a playlist', async () => {
    context = await createTestContext();
    const account = seedAccount(context.database, {
      pangolinUserId: 'owner-1'
    });
    const { playlistId } = seedPlaylist(context.database, account.accountId);
    const { trackId } = seedTrack(context.database);
    associate(context.database, playlistId, trackId);
    const received = collect(account.accountId);

    const response = await request(
      'DELETE',
      `/api/v1/playlists/${playlistId}/tracks/${trackId}`,
      'owner-1'
    );

    expect(response.statusCode).toBe(204);
    expect(received).toEqual([
      { type: LiveEventType.TrackChanged, playlistIds: [playlistId] }
    ]);
  });

  it('publishes a track change when a failed track is retried', async () => {
    context = await createTestContext();
    const account = seedAccount(context.database, {
      pangolinUserId: 'owner-1'
    });
    const { playlistId } = seedPlaylist(context.database, account.accountId);
    const { trackId } = seedTrack(context.database, {
      fileStatus: TrackFileStatus.Failed
    });
    associate(context.database, playlistId, trackId);
    const received = collect(account.accountId);

    const response = await request(
      'POST',
      `/api/v1/tracks/${trackId}/retry`,
      'owner-1'
    );

    expect(response.statusCode).toBe(200);
    expect(received).toEqual([
      { type: LiveEventType.TrackChanged, playlistIds: [playlistId] }
    ]);
  });

  it('tells each account only about the holding playlists it can see', async () => {
    context = await createTestContext();
    const ownerA = seedAccount(context.database, { pangolinUserId: 'owner-a' });
    const ownerB = seedAccount(context.database, { pangolinUserId: 'owner-b' });
    const collaborator = seedAccount(context.database, {
      pangolinUserId: 'collaborator-1'
    });
    const stranger = seedAccount(context.database, {
      pangolinUserId: 'stranger-1'
    });
    const { playlistId: playlistA } = seedPlaylist(
      context.database,
      ownerA.accountId
    );
    const { playlistId: playlistB } = seedPlaylist(
      context.database,
      ownerB.accountId
    );
    seedShare(context.database, playlistA, collaborator.accountId);

    // One track held by both playlists, so a change to it is a change to both.
    const { trackId } = seedTrack(context.database, {
      fileStatus: TrackFileStatus.Failed
    });
    associate(context.database, playlistA, trackId);
    associate(context.database, playlistB, trackId);

    const ownerAEvents = collect(ownerA.accountId);
    const ownerBEvents = collect(ownerB.accountId);
    const collaboratorEvents = collect(collaborator.accountId);
    const strangerEvents = collect(stranger.accountId);

    const response = await request(
      'POST',
      `/api/v1/tracks/${trackId}/retry`,
      'owner-a'
    );

    expect(response.statusCode).toBe(200);
    // Each account hears only the playlist it can reach; the collaborator sees
    // playlist A and never playlist B, and the stranger hears nothing at all.
    expect(ownerAEvents).toEqual([
      { type: LiveEventType.TrackChanged, playlistIds: [playlistA] }
    ]);
    expect(ownerBEvents).toEqual([
      { type: LiveEventType.TrackChanged, playlistIds: [playlistB] }
    ]);
    expect(collaboratorEvents).toEqual([
      { type: LiveEventType.TrackChanged, playlistIds: [playlistA] }
    ]);
    expect(strangerEvents).toEqual([]);
  });

  it('tells a batch-add collaborator only about the playlists it can see', async () => {
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(testVideo('bbbbbbbbbbb')) }
    );
    const owner = seedAccount(context.database, { pangolinUserId: 'owner-a' });
    const collaborator = seedAccount(context.database, {
      pangolinUserId: 'collaborator-1'
    });
    const { playlistId: playlistA } = seedPlaylist(
      context.database,
      owner.accountId
    );
    const { playlistId: playlistB } = seedPlaylist(
      context.database,
      owner.accountId
    );
    seedShare(context.database, playlistA, collaborator.accountId);

    const ownerEvents = collect(owner.accountId);
    const collaboratorEvents = collect(collaborator.accountId);

    const response = await request('POST', '/api/v1/tracks', 'owner-a', {
      url: VIDEO_URL,
      playlistIds: [playlistA, playlistB]
    });

    expect(response.statusCode).toBe(200);
    expect(ownerEvents).toEqual([
      { type: LiveEventType.TrackChanged, playlistIds: [playlistA, playlistB] }
    ]);
    expect(collaboratorEvents).toEqual([
      { type: LiveEventType.TrackChanged, playlistIds: [playlistA] }
    ]);
  });

  it('resolves a batch track change in one query rather than one per playlist', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database, {
      pangolinUserId: 'owner-1'
    });
    const playlistIds = [
      seedPlaylist(context.database, owner.accountId).playlistId,
      seedPlaylist(context.database, owner.accountId).playlistId,
      seedPlaylist(context.database, owner.accountId).playlistId
    ];
    const select = vi.spyOn(context.database.db, 'select');

    publishTracksChangedForPlaylists(context, playlistIds);

    expect(select).toHaveBeenCalledTimes(1);
  });

  it('publishes nothing when a playlist is pinned, because a pin is not the playlist', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database, { pangolinUserId: 'owner-1' });
    const { playlistId } = seedPlaylist(context.database, owner.accountId);
    const collaborator = seedAccount(context.database, {
      pangolinUserId: 'collaborator-1'
    });
    seedShare(context.database, playlistId, collaborator.accountId);
    const ownerEvents = collect(owner.accountId);
    const collaboratorEvents = collect(collaborator.accountId);

    const response = await request(
      'PATCH',
      `/api/v1/playlists/${playlistId}/pin`,
      'owner-1',
      { pinned: true }
    );

    expect(response.statusCode).toBe(200);
    // Pin is the account's own placement: the playlist did not change, so no
    // refetch happens, and the acting client invalidates its own gallery.
    expect(ownerEvents).toEqual([]);
    expect(collaboratorEvents).toEqual([]);
  });

  it('publishes nothing when a rename is refused', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database, { pangolinUserId: 'owner-1' });
    const { playlistId } = seedPlaylist(context.database, owner.accountId);
    const stranger = seedAccount(context.database, {
      pangolinUserId: 'stranger-1'
    });
    const ownerEvents = collect(owner.accountId);
    const strangerEvents = collect(stranger.accountId);

    const response = await request(
      'PATCH',
      `/api/v1/playlists/${playlistId}`,
      'stranger-1',
      { name: 'Not Mine' }
    );

    expect(response.statusCode).toBe(404);
    expect(ownerEvents).toEqual([]);
    expect(strangerEvents).toEqual([]);
  });

  it('publishes nothing when a track removal is refused', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database, { pangolinUserId: 'owner-1' });
    const { playlistId } = seedPlaylist(context.database, owner.accountId);
    const { trackId } = seedTrack(context.database);
    const received = collect(owner.accountId);

    const response = await request(
      'DELETE',
      `/api/v1/playlists/${playlistId}/tracks/${trackId}`,
      'owner-1'
    );

    expect(response.statusCode).toBe(404);
    expect(received).toEqual([]);
  });

  it('publishes nothing when a share grant is refused', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database, { pangolinUserId: 'owner-1' });
    const { playlistId } = seedPlaylist(context.database, owner.accountId);
    const stranger = seedAccount(context.database, {
      pangolinUserId: 'stranger-1'
    });
    const ownerEvents = collect(owner.accountId);
    const strangerEvents = collect(stranger.accountId);

    const response = await request(
      'POST',
      `/api/v1/playlists/${playlistId}/shares`,
      'stranger-1',
      { accountId: owner.accountId, level: ShareLevel.Read }
    );

    expect(response.statusCode).toBe(404);
    expect(ownerEvents).toEqual([]);
    expect(strangerEvents).toEqual([]);
  });

  it('publishes nothing when a retry is refused', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database, { pangolinUserId: 'owner-1' });
    const { playlistId } = seedPlaylist(context.database, owner.accountId);
    const { trackId } = seedTrack(context.database);
    associate(context.database, playlistId, trackId);
    const received = collect(owner.accountId);

    const response = await request(
      'POST',
      `/api/v1/tracks/${trackId}/retry`,
      'owner-1'
    );

    expect(response.statusCode).toBe(409);
    expect(received).toEqual([]);
  });
});
