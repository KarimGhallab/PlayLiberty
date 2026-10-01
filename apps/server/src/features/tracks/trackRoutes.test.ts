import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AddTrackOutcome,
  AddTrackResultSchema,
  AssociationOrigin,
  Provider,
  ShareLevel,
  TrackFileStatus,
  TrackSchema,
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
  syncRuns,
  tracks
} from '../../platform/database/schema.js';
import { addAssociation } from '../playlists/associationService.js';

const VIDEO_ID = 'dQw4w9WgXcQ';
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PL1234567890abcdef';

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

function post(
  url: string,
  pangolinUserId: string,
  payload: Record<string, unknown>
) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'POST',
    url,
    headers: { 'remote-user': pangolinUserId, 'x-playliberty-client': 'test' },
    payload
  });
}

function seedAccount(): { accountId: string; pangolinUserId: string } {
  const accountId = randomUUID();
  const pangolinUserId = `pangolin-${accountId}`;

  database()
    .db.insert(accounts)
    .values({
      id: accountId,
      pangolinUserId,
      displayName: 'Account',
      email: null,
      avatarUrl: null,
      role: UserRole.User
    })
    .run();

  return { accountId, pangolinUserId };
}

function seedPlaylist(ownerAccountId: string): string {
  const playlistId = randomUUID();

  database()
    .db.insert(playlists)
    .values({
      id: playlistId,
      ownerAccountId,
      name: 'Playlist',
      coverUrl: null,
      provider: Provider.Youtube,
      sourcePlaylistId: `source-${playlistId}`
    })
    .run();

  return playlistId;
}

function seedTrack(
  videoId: string,
  fileStatus: TrackFileStatus = TrackFileStatus.Stored,
  failureReason: string | null = null
): string {
  const trackId = randomUUID();

  database()
    .db.insert(tracks)
    .values({
      id: trackId,
      provider: Provider.Youtube,
      videoId,
      title: 'Track',
      durationSeconds: 180,
      thumbnailPath: null,
      fileStatus,
      sourceStatus: TrackSourceStatus.Available,
      filePath: null,
      failureReason
    })
    .run();

  return trackId;
}

/*
 * The association is created through the service rather than inserted, because
 * that is the only path that keeps the playlist's stored count honest, and the
 * retry access rule reads the association table.
 */
function associate(playlistId: string, trackId: string): void {
  expect(
    addAssociation(database(), {
      playlistId,
      trackId,
      origin: AssociationOrigin.Remote,
      position: 0
    })
  ).toBe('added');
}

function seedShare(
  playlistId: string,
  accountId: string,
  level: ShareLevel
): void {
  database()
    .db.insert(shares)
    .values({ id: randomUUID(), playlistId, accountId, level })
    .run();
}

function countTracks(): number {
  return (
    database()
      .db.select({ total: sql<number>`count(*)` })
      .from(tracks)
      .get()?.total ?? 0
  );
}

function countAssociations(): number {
  return (
    database()
      .db.select({ total: sql<number>`count(*)` })
      .from(associations)
      .get()?.total ?? 0
  );
}

const invalidPayloads: [string, Record<string, unknown>][] = [
  ['a playlist URL', { url: PLAYLIST_URL, playlistIds: ['p'] }],
  ['an empty list', { url: VIDEO_URL, playlistIds: [] }],
  ['a malformed URL', { url: 'not a url', playlistIds: ['p'] }],
  [
    'more than a hundred ids',
    { url: VIDEO_URL, playlistIds: Array.from({ length: 101 }, () => 'p') }
  ]
];

describe('POST /tracks', () => {
  it('adds one track and one manual association to each writable playlist, in order', async () => {
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(testVideo(VIDEO_ID)) }
    );
    const owner = seedAccount();
    const playlistIds = [
      seedPlaylist(owner.accountId),
      seedPlaylist(owner.accountId),
      seedPlaylist(owner.accountId)
    ];

    const response = await post('/api/v1/tracks', owner.pangolinUserId, {
      url: VIDEO_URL,
      playlistIds
    });

    expect(response.statusCode).toBe(200);
    const result = AddTrackResultSchema.parse(response.json());
    expect(result.results).toEqual(
      playlistIds.map(playlistId => ({
        playlistId,
        outcome: AddTrackOutcome.Added
      }))
    );

    // One track, however many playlists asked for it.
    expect(countTracks()).toBe(1);
    const track = database().db.select().from(tracks).get();
    expect(track?.fileStatus).toBe(TrackFileStatus.Pending);
    expect(track?.title).toBe(`Track ${VIDEO_ID}`);

    for (const playlistId of playlistIds) {
      const playlist = database()
        .db.select()
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .get();
      expect(playlist?.trackCount).toBe(1);

      const association = database()
        .db.select()
        .from(associations)
        .where(eq(associations.playlistId, playlistId))
        .get();
      expect(association?.origin).toBe(AssociationOrigin.Manual);
      expect(association?.position).toBe(0);
    }
  });

  it('reports a refusal per playlist while the writable playlists in the same batch succeed', async () => {
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(testVideo(VIDEO_ID)) }
    );
    const caller = seedAccount();
    const other = seedAccount();
    const writable = seedPlaylist(caller.accountId);
    const readOnly = seedPlaylist(other.accountId);
    seedShare(readOnly, caller.accountId, ShareLevel.Read);
    const missing = randomUUID();

    const response = await post('/api/v1/tracks', caller.pangolinUserId, {
      url: VIDEO_URL,
      playlistIds: [writable, readOnly, missing]
    });

    const result = AddTrackResultSchema.parse(response.json());
    // One outcome per id, in the order the ids were sent.
    expect(result.results).toEqual([
      { playlistId: writable, outcome: AddTrackOutcome.Added },
      { playlistId: readOnly, outcome: AddTrackOutcome.Refused },
      { playlistId: missing, outcome: AddTrackOutcome.Refused }
    ]);

    // A refused playlist the account can see and one that does not exist answer
    // with the same two fields, so nothing tells them apart.
    expect(Object.keys(result.results[1] ?? {}).sort()).toEqual([
      'outcome',
      'playlistId'
    ]);
    expect(result.results[1]?.outcome).toBe(result.results[2]?.outcome);

    const writablePlaylist = database()
      .db.select()
      .from(playlists)
      .where(eq(playlists.id, writable))
      .get();
    expect(writablePlaylist?.trackCount).toBe(1);

    const readOnlyPlaylist = database()
      .db.select()
      .from(playlists)
      .where(eq(playlists.id, readOnly))
      .get();
    expect(readOnlyPlaylist?.trackCount).toBe(0);
    expect(
      database()
        .db.select()
        .from(associations)
        .where(eq(associations.playlistId, readOnly))
        .get()
    ).toBeUndefined();
  });

  it('reports a playlist that already holds the video as already_present and succeeds', async () => {
    // No source is queued: the track exists, so the route must not read the source.
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount();
    const holding = seedPlaylist(owner.accountId);
    const fresh = seedPlaylist(owner.accountId);
    const trackId = seedTrack(VIDEO_ID);
    expect(
      addAssociation(database(), {
        playlistId: holding,
        trackId,
        origin: AssociationOrigin.Remote,
        position: 0
      })
    ).toBe('added');

    const response = await post('/api/v1/tracks', owner.pangolinUserId, {
      url: VIDEO_URL,
      playlistIds: [holding, fresh]
    });

    const result = AddTrackResultSchema.parse(response.json());
    expect(result.results).toEqual([
      { playlistId: holding, outcome: AddTrackOutcome.AlreadyPresent },
      { playlistId: fresh, outcome: AddTrackOutcome.Added }
    ]);

    expect(
      database()
        .db.select()
        .from(playlists)
        .where(eq(playlists.id, holding))
        .get()?.trackCount
    ).toBe(1);
    expect(
      database()
        .db.select()
        .from(playlists)
        .where(eq(playlists.id, fresh))
        .get()?.trackCount
    ).toBe(1);
  });

  it.each(invalidPayloads)(
    'refuses %s with 422 and creates nothing',
    async (_name, payload) => {
      context = await createTestContext(
        {},
        { youtube: createFakeYoutube(testVideo(VIDEO_ID)) }
      );
      const owner = seedAccount();

      const response = await post(
        '/api/v1/tracks',
        owner.pangolinUserId,
        payload
      );

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({ code: 'unprocessable_request' });
      expect(countTracks()).toBe(0);
      expect(countAssociations()).toBe(0);
    }
  );

  it('reuses an existing stored track untouched and does not read the source again', async () => {
    // No source is queued, so a read would throw and fail the request.
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount();
    const playlistId = seedPlaylist(owner.accountId);
    const trackId = seedTrack(VIDEO_ID, TrackFileStatus.Stored);

    const response = await post('/api/v1/tracks', owner.pangolinUserId, {
      url: VIDEO_URL,
      playlistIds: [playlistId]
    });

    expect(response.statusCode).toBe(200);
    const result = AddTrackResultSchema.parse(response.json());
    expect(result.results).toEqual([
      { playlistId, outcome: AddTrackOutcome.Added }
    ]);
    expect(countTracks()).toBe(1);
    expect(
      database().db.select().from(tracks).where(eq(tracks.id, trackId)).get()
        ?.fileStatus
    ).toBe(TrackFileStatus.Stored);
  });

  it('reuses an existing failed track untouched rather than re-queuing it', async () => {
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount();
    const playlistId = seedPlaylist(owner.accountId);
    const trackId = seedTrack(VIDEO_ID, TrackFileStatus.Failed);

    await post('/api/v1/tracks', owner.pangolinUserId, {
      url: VIDEO_URL,
      playlistIds: [playlistId]
    });

    expect(countTracks()).toBe(1);
    expect(
      database().db.select().from(tracks).where(eq(tracks.id, trackId)).get()
        ?.fileStatus
    ).toBe(TrackFileStatus.Failed);
  });

  it('appends the new association and leaves an existing position alone', async () => {
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(testVideo(VIDEO_ID)) }
    );
    const owner = seedAccount();
    const playlistId = seedPlaylist(owner.accountId);
    const existingTrack = seedTrack('existingVideo');
    expect(
      addAssociation(database(), {
        playlistId,
        trackId: existingTrack,
        origin: AssociationOrigin.Remote,
        position: 3
      })
    ).toBe('added');

    await post('/api/v1/tracks', owner.pangolinUserId, {
      url: VIDEO_URL,
      playlistIds: [playlistId]
    });

    const rows = database()
      .db.select()
      .from(associations)
      .where(eq(associations.playlistId, playlistId))
      .all();
    expect(rows.find(row => row.trackId === existingTrack)?.position).toBe(3);
    expect(rows.find(row => row.trackId !== existingTrack)?.position).toBe(4);
    expect(
      database()
        .db.select()
        .from(playlists)
        .where(eq(playlists.id, playlistId))
        .get()?.trackCount
    ).toBe(2);
  });

  it('no longer serves the nested per-playlist add route', async () => {
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(testVideo(VIDEO_ID)) }
    );
    const owner = seedAccount();
    const playlistId = seedPlaylist(owner.accountId);

    const response = await post(
      `/api/v1/playlists/${playlistId}/tracks`,
      owner.pangolinUserId,
      { url: VIDEO_URL }
    );

    expect(response.statusCode).toBe(404);
  });

  it('refuses a request without the client header', async () => {
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(testVideo(VIDEO_ID)) }
    );
    const owner = seedAccount();

    if (context === undefined) {
      throw new Error('the test context is not created');
    }

    const response = await context.app.inject({
      method: 'POST',
      url: '/api/v1/tracks',
      headers: { 'remote-user': owner.pangolinUserId },
      payload: { url: VIDEO_URL, playlistIds: [randomUUID()] }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'csrf_header_missing' });
  });
});

describe('POST /tracks/:id/retry', () => {
  it('returns a failed track to pending and clears its reason', async () => {
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount();
    const playlistId = seedPlaylist(owner.accountId);
    const trackId = seedTrack(
      VIDEO_ID,
      TrackFileStatus.Failed,
      'yt-dlp exited with code 1'
    );
    associate(playlistId, trackId);

    const response = await post(
      `/api/v1/tracks/${trackId}/retry`,
      owner.pangolinUserId,
      {}
    );

    expect(response.statusCode).toBe(200);
    const track = TrackSchema.parse(response.json());
    expect(track.fileStatus).toBe(TrackFileStatus.Pending);
    expect(track.failureReason).toBeNull();

    const row = database()
      .db.select()
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .get();
    expect(row?.fileStatus).toBe(TrackFileStatus.Pending);
    expect(row?.failureReason).toBeNull();
  });

  it('lets a write collaborator of a playlist holding the track retry it', async () => {
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount();
    const playlistId = seedPlaylist(owner.accountId);
    const trackId = seedTrack(VIDEO_ID, TrackFileStatus.Failed, 'boom');
    associate(playlistId, trackId);
    const writer = seedAccount();
    seedShare(playlistId, writer.accountId, ShareLevel.Write);

    const response = await post(
      `/api/v1/tracks/${trackId}/retry`,
      writer.pangolinUserId,
      {}
    );

    expect(response.statusCode).toBe(200);
    expect(TrackSchema.parse(response.json()).fileStatus).toBe(
      TrackFileStatus.Pending
    );
  });

  it('starts no sync and creates no run', async () => {
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount();
    const playlistId = seedPlaylist(owner.accountId);
    const trackId = seedTrack(VIDEO_ID, TrackFileStatus.Failed, 'boom');
    associate(playlistId, trackId);

    await post(`/api/v1/tracks/${trackId}/retry`, owner.pangolinUserId, {});

    expect(
      database()
        .db.select({ total: sql<number>`count(*)` })
        .from(syncRuns)
        .get()?.total
    ).toBe(0);
  });

  it.each([
    TrackFileStatus.Unavailable,
    TrackFileStatus.Stored,
    TrackFileStatus.Pending,
    TrackFileStatus.Downloading
  ])('refuses a %s track and leaves its state alone', async fileStatus => {
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount();
    const playlistId = seedPlaylist(owner.accountId);
    const trackId = seedTrack(VIDEO_ID, fileStatus);
    associate(playlistId, trackId);

    const response = await post(
      `/api/v1/tracks/${trackId}/retry`,
      owner.pangolinUserId,
      {}
    );

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: 'track_not_retryable' });
    expect(
      database().db.select().from(tracks).where(eq(tracks.id, trackId)).get()
        ?.fileStatus
    ).toBe(fileStatus);
  });

  it('answers 404 for a read collaborator, a stranger, an orphan track and a missing track', async () => {
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount();
    const playlistId = seedPlaylist(owner.accountId);
    const trackId = seedTrack(VIDEO_ID, TrackFileStatus.Failed, 'boom');
    associate(playlistId, trackId);
    const reader = seedAccount();
    seedShare(playlistId, reader.accountId, ShareLevel.Read);
    const stranger = seedAccount();
    const orphan = seedTrack('orphanVideo', TrackFileStatus.Failed, 'boom');
    const missing = randomUUID();

    const attempts: [string, string][] = [
      [trackId, reader.pangolinUserId],
      [trackId, stranger.pangolinUserId],
      [orphan, owner.pangolinUserId],
      [missing, owner.pangolinUserId]
    ];

    for (const [targetTrack, pangolinUserId] of attempts) {
      const response = await post(
        `/api/v1/tracks/${targetTrack}/retry`,
        pangolinUserId,
        {}
      );

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ code: 'track_not_found' });
    }

    // No refused attempt retried the failed track.
    expect(
      database().db.select().from(tracks).where(eq(tracks.id, trackId)).get()
        ?.fileStatus
    ).toBe(TrackFileStatus.Failed);
  });

  it('refuses a request without the client header', async () => {
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount();
    const playlistId = seedPlaylist(owner.accountId);
    const trackId = seedTrack(VIDEO_ID, TrackFileStatus.Failed, 'boom');
    associate(playlistId, trackId);

    if (context === undefined) {
      throw new Error('the test context is not created');
    }

    const response = await context.app.inject({
      method: 'POST',
      url: `/api/v1/tracks/${trackId}/retry`,
      headers: { 'remote-user': owner.pangolinUserId },
      payload: {}
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'csrf_header_missing' });
  });
});
