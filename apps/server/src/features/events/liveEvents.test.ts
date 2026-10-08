import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import type { LiveEvent } from '@playliberty/contracts';
import {
  AssociationOrigin,
  LiveEventType,
  Provider,
  ShareLevel,
  TrackFileStatus,
  TrackSourceStatus,
  UserRole
} from '@playliberty/contracts';

import type { TestContext } from '../../app/testing/createTestContext.js';
import { createTestContext } from '../../app/testing/createTestContext.js';
import { createFakeYoutube, testVideo } from '../../app/testing/fakeYoutube.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import {
  accounts,
  associations,
  playlists,
  shares,
  tracks
} from '../../platform/database/schema.js';

/*
 * The events the playlist and track features publish, observed on the bus the
 * test context builds. The routes are driven through `inject`, so what is under
 * test is the real handler deciding to publish and the audience it chose, not a
 * publisher called by hand.
 */

const VIDEO_URL = 'https://www.youtube.com/watch?v=bbbbbbbbbbb';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

function seedAccount(
  database: DatabaseHandle,
  pangolinUserId = 'owner-1'
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
      provider: Provider.Youtube,
      sourcePlaylistId: `source-${id}`
    })
    .run();

  return id;
}

function seedTrack(
  database: DatabaseHandle,
  playlistId: string,
  fileStatus: TrackFileStatus = TrackFileStatus.Stored
): string {
  const trackId = randomUUID();

  database.db
    .insert(tracks)
    .values({
      id: trackId,
      provider: Provider.Youtube,
      videoId: `v${trackId.replaceAll('-', '').slice(0, 11)}`,
      title: 'Track',
      durationSeconds: null,
      skipNonMusic: true,
      thumbnailPath: null,
      thumbnailUrl: null,
      fileStatus,
      sourceStatus: TrackSourceStatus.Available,
      filePath: null,
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

  return trackId;
}

function grantShare(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string
): void {
  database.db
    .insert(shares)
    .values({
      id: randomUUID(),
      playlistId,
      accountId,
      level: ShareLevel.Read
    })
    .run();
}

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
    const accountId = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, accountId);
    const received = collect(accountId);

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
    const ownerAccountId = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, ownerAccountId);
    const collaboratorId = seedAccount(context.database, 'collaborator-1');
    const strangerId = seedAccount(context.database, 'stranger-1');
    grantShare(context.database, playlistId, collaboratorId);
    const collaboratorEvents = collect(collaboratorId);
    const strangerEvents = collect(strangerId);

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
    const ownerAccountId = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, ownerAccountId);
    const collaboratorId = seedAccount(context.database, 'collaborator-1');
    grantShare(context.database, playlistId, collaboratorId);
    const ownerEvents = collect(ownerAccountId);
    const collaboratorEvents = collect(collaboratorId);

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
    const ownerAccountId = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, ownerAccountId);
    const granteeId = seedAccount(context.database, 'grantee-1');
    const ownerEvents = collect(ownerAccountId);
    const granteeEvents = collect(granteeId);

    const response = await request(
      'POST',
      `/api/v1/playlists/${playlistId}/shares`,
      'owner-1',
      { accountId: granteeId, level: ShareLevel.Read }
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
    const ownerAccountId = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, ownerAccountId);
    const granteeId = seedAccount(context.database, 'grantee-1');
    grantShare(context.database, playlistId, granteeId);
    const ownerEvents = collect(ownerAccountId);
    const granteeEvents = collect(granteeId);

    const response = await request(
      'DELETE',
      `/api/v1/playlists/${playlistId}/shares/${granteeId}`,
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
    const accountId = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, accountId);
    const received = collect(accountId);

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
    const accountId = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, accountId);
    const trackId = seedTrack(context.database, playlistId);
    const received = collect(accountId);

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
    const accountId = seedAccount(context.database);
    const playlistId = seedPlaylist(context.database, accountId);
    const trackId = seedTrack(
      context.database,
      playlistId,
      TrackFileStatus.Failed
    );
    const received = collect(accountId);

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
    const ownerA = seedAccount(context.database, 'owner-a');
    const ownerB = seedAccount(context.database, 'owner-b');
    const collaborator = seedAccount(context.database, 'collaborator-1');
    const stranger = seedAccount(context.database, 'stranger-1');
    const playlistA = seedPlaylist(context.database, ownerA);
    const playlistB = seedPlaylist(context.database, ownerB);
    grantShare(context.database, playlistA, collaborator);

    // One track held by both playlists, so a change to it is a change to both.
    const trackId = seedTrack(
      context.database,
      playlistA,
      TrackFileStatus.Failed
    );
    context.database.db
      .insert(associations)
      .values({
        id: randomUUID(),
        playlistId: playlistB,
        trackId,
        origin: AssociationOrigin.Remote,
        position: 0
      })
      .run();

    const ownerAEvents = collect(ownerA);
    const ownerBEvents = collect(ownerB);
    const collaboratorEvents = collect(collaborator);
    const strangerEvents = collect(stranger);

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
    const owner = seedAccount(context.database, 'owner-a');
    const collaborator = seedAccount(context.database, 'collaborator-1');
    const playlistA = seedPlaylist(context.database, owner);
    const playlistB = seedPlaylist(context.database, owner);
    grantShare(context.database, playlistA, collaborator);

    const ownerEvents = collect(owner);
    const collaboratorEvents = collect(collaborator);

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
});
