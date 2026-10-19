import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AddTrackOutcome,
  AddTrackResultSchema,
  AssociationOrigin,
  ShareLevel,
  TrackFileStatus,
  TrackSchema
} from '@playliberty/contracts';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';
import {
  createFakeYoutube,
  testVideo
} from '../../../app/testing/fakeYoutube.js';
import {
  associate,
  seedAccount,
  seedPlaylist,
  seedShare,
  seedStoredTrack,
  seedTrack
} from '../../../app/testing/fixtures.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import {
  associations,
  playlists,
  syncRuns,
  tracks
} from '../../../platform/database/schema.js';
import { addAssociation } from '../../playlists/associationService.js';

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

function get(url: string, pangolinUserId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'GET',
    url,
    headers: { 'remote-user': pangolinUserId, 'x-playliberty-client': 'test' }
  });
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

function playlistTrackCount(playlistId: string): number {
  return (
    database()
      .db.select({ trackCount: playlists.trackCount })
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .get()?.trackCount ?? -1
  );
}

const invalidPayloads: [string, Record<string, unknown>, string][] = [
  [
    'a playlist URL',
    { url: PLAYLIST_URL, playlistIds: ['p'] },
    'unprocessable_request'
  ],
  ['an empty list', { url: VIDEO_URL, playlistIds: [] }, 'validation_failed'],
  [
    'a malformed URL',
    { url: 'not a url', playlistIds: ['p'] },
    'validation_failed'
  ],
  [
    'more than a hundred ids',
    { url: VIDEO_URL, playlistIds: Array.from({ length: 101 }, () => 'p') },
    'validation_failed'
  ]
];

describe('POST /tracks', () => {
  it('adds one track and one manual association to each writable playlist, in order', async () => {
    const kick = vi.fn();
    context = await createTestContext(
      {},
      {
        youtube: createFakeYoutube(testVideo(VIDEO_ID)),
        kickDownloads: kick
      }
    );
    const owner = seedAccount(database());
    const playlistIds = [
      seedPlaylist(database(), owner.accountId).playlistId,
      seedPlaylist(database(), owner.accountId).playlistId,
      seedPlaylist(database(), owner.accountId).playlistId
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

    /* The queued track is downloaded now, not at the worker's next tick. */
    expect(kick).toHaveBeenCalledTimes(1);
  });

  it('records the first writable playlist value on the track it creates', async () => {
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(testVideo(VIDEO_ID)) }
    );
    const caller = seedAccount(database());
    const other = seedAccount(database());
    // Refused playlist first, writable second: the value comes from the first
    // *writable* id, not the first id.
    const readOnly = seedPlaylist(database(), other.accountId, {
      skipNonMusic: true
    }).playlistId;
    seedShare(database(), readOnly, caller.accountId, {
      level: ShareLevel.Read
    });
    const writable = seedPlaylist(database(), caller.accountId, {
      skipNonMusic: false
    }).playlistId;

    const response = await post('/api/v1/tracks', caller.pangolinUserId, {
      url: VIDEO_URL,
      playlistIds: [readOnly, writable]
    });

    expect(AddTrackResultSchema.parse(response.json()).results).toEqual([
      { playlistId: readOnly, outcome: AddTrackOutcome.Refused },
      { playlistId: writable, outcome: AddTrackOutcome.Added }
    ]);

    const track = database().db.select().from(tracks).get();
    expect(track?.skipNonMusic).toBe(false);
  });

  it('reports a refusal per playlist while the writable playlists in the same batch succeed', async () => {
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(testVideo(VIDEO_ID)) }
    );
    const caller = seedAccount(database());
    const other = seedAccount(database());
    const writable = seedPlaylist(database(), caller.accountId).playlistId;
    const readOnly = seedPlaylist(database(), other.accountId).playlistId;
    seedShare(database(), readOnly, caller.accountId, {
      level: ShareLevel.Read
    });
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

    // A refused playlist it can see and a missing one are one answer, not two.
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

  it('rolls the whole batch back when one association cannot be written', async () => {
    let doomed = '';
    const fake = createFakeYoutube(testVideo(VIDEO_ID));
    const youtube = {
      ...fake,
      listSource: async () => {
        /* The access check already passed; the playlist goes before its
         * association is written, so the batch fails halfway. */
        database().db.delete(playlists).where(eq(playlists.id, doomed)).run();

        return fake.listSource(VIDEO_URL);
      }
    };
    const kick = vi.fn();
    context = await createTestContext({}, { youtube, kickDownloads: kick });
    const owner = seedAccount(database());
    const writable = seedPlaylist(database(), owner.accountId).playlistId;
    doomed = seedPlaylist(database(), owner.accountId).playlistId;

    const response = await post('/api/v1/tracks', owner.pangolinUserId, {
      url: VIDEO_URL,
      playlistIds: [writable, doomed]
    });

    expect(response.statusCode).toBe(500);
    // The track, the first association and its count all roll back together.
    expect(countTracks()).toBe(0);
    expect(countAssociations()).toBe(0);
    expect(playlistTrackCount(writable)).toBe(0);
    // No work survived, so the worker is not woken.
    expect(kick).not.toHaveBeenCalled();
  });

  it('reports a playlist that already holds the video as already_present and succeeds', async () => {
    // No source is queued: the track exists, so the route must not read it.
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount(database());
    const holding = seedPlaylist(database(), owner.accountId).playlistId;
    const fresh = seedPlaylist(database(), owner.accountId).playlistId;
    const { trackId } = seedTrack(database(), { videoId: VIDEO_ID });
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
    async (_name, payload, code) => {
      context = await createTestContext(
        {},
        { youtube: createFakeYoutube(testVideo(VIDEO_ID)) }
      );
      const owner = seedAccount(database());

      const response = await post(
        '/api/v1/tracks',
        owner.pangolinUserId,
        payload
      );

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({ code });
      expect(countTracks()).toBe(0);
      expect(countAssociations()).toBe(0);
    }
  );

  it('reuses an existing stored track untouched and does not read the source again', async () => {
    // No source is queued, so a read would throw and fail the request.
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount(database());
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const { trackId } = seedTrack(database(), {
      videoId: VIDEO_ID,
      fileStatus: TrackFileStatus.Stored
    });

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
    const owner = seedAccount(database());
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const { trackId } = seedTrack(database(), {
      videoId: VIDEO_ID,
      fileStatus: TrackFileStatus.Failed
    });

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
    const owner = seedAccount(database());
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const { trackId: existingTrack } = seedTrack(database(), {
      videoId: 'existingVideo'
    });
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
    const owner = seedAccount(database());
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;

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
    const owner = seedAccount(database());

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
  it('returns a failed track to pending, clears its reason and wakes the worker', async () => {
    const kick = vi.fn();
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(), kickDownloads: kick }
    );
    const owner = seedAccount(database());
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const { trackId } = seedTrack(database(), {
      videoId: VIDEO_ID,
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'yt-dlp exited with code 1'
    });
    associate(database(), playlistId, trackId);

    const response = await post(
      `/api/v1/tracks/${trackId}/retry`,
      owner.pangolinUserId,
      {}
    );

    expect(response.statusCode).toBe(200);
    /* The re-queued track is downloaded now, not at the worker's next tick. */
    expect(kick).toHaveBeenCalledTimes(1);
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
    const owner = seedAccount(database());
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const { trackId } = seedTrack(database(), {
      videoId: VIDEO_ID,
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'boom'
    });
    associate(database(), playlistId, trackId);
    const writer = seedAccount(database());
    seedShare(database(), playlistId, writer.accountId, {
      level: ShareLevel.Write
    });

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
    const owner = seedAccount(database());
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const { trackId } = seedTrack(database(), {
      videoId: VIDEO_ID,
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'boom'
    });
    associate(database(), playlistId, trackId);

    await post(`/api/v1/tracks/${trackId}/retry`, owner.pangolinUserId, {});

    expect(
      database()
        .db.select({ total: sql<number>`count(*)` })
        .from(syncRuns)
        .get()?.total
    ).toBe(0);
  });

  it.each([TrackFileStatus.Stored])(
    'refuses a %s track and leaves its state alone',
    async fileStatus => {
      const kick = vi.fn();
      context = await createTestContext(
        {},
        { youtube: createFakeYoutube(), kickDownloads: kick }
      );
      const owner = seedAccount(database());
      const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
      const { trackId } = seedTrack(database(), {
        videoId: VIDEO_ID,
        fileStatus
      });
      associate(database(), playlistId, trackId);

      const response = await post(
        `/api/v1/tracks/${trackId}/retry`,
        owner.pangolinUserId,
        {}
      );

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ code: 'track_not_retryable' });
      expect(kick).not.toHaveBeenCalled();
      expect(
        database().db.select().from(tracks).where(eq(tracks.id, trackId)).get()
          ?.fileStatus
      ).toBe(fileStatus);
    }
  );

  it('answers 404 for a read collaborator, a stranger, an orphan track and a missing track', async () => {
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount(database());
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const { trackId } = seedTrack(database(), {
      videoId: VIDEO_ID,
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'boom'
    });
    associate(database(), playlistId, trackId);
    const reader = seedAccount(database());
    seedShare(database(), playlistId, reader.accountId, {
      level: ShareLevel.Read
    });
    const stranger = seedAccount(database());
    const { trackId: orphan } = seedTrack(database(), {
      videoId: 'orphanVideo',
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'boom'
    });
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
    const owner = seedAccount(database());
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const { trackId } = seedTrack(database(), {
      videoId: VIDEO_ID,
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'boom'
    });
    associate(database(), playlistId, trackId);

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

describe('POST /tracks/:id/fetch-whole', () => {
  it.each([TrackFileStatus.Failed])(
    'flips the policy to false and returns a %s track to pending',
    async fileStatus => {
      const kick = vi.fn();
      context = await createTestContext(
        {},
        { youtube: createFakeYoutube(), kickDownloads: kick }
      );
      const owner = seedAccount(database());
      const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
      const { trackId } = seedTrack(database(), {
        videoId: VIDEO_ID,
        fileStatus,
        failureReason: 'a reason',
        skipNonMusic: true
      });
      associate(database(), playlistId, trackId);

      const response = await post(
        `/api/v1/tracks/${trackId}/fetch-whole`,
        owner.pangolinUserId,
        {}
      );

      expect(response.statusCode).toBe(200);
      /* The track is fetched now, not at the worker's next tick. */
      expect(kick).toHaveBeenCalledTimes(1);
      const track = TrackSchema.parse(response.json());
      expect(track.fileStatus).toBe(TrackFileStatus.Pending);
      expect(track.skipNonMusic).toBe(false);
      expect(track.failureReason).toBeNull();

      const row = database()
        .db.select()
        .from(tracks)
        .where(eq(tracks.id, trackId))
        .get();
      expect(row?.fileStatus).toBe(TrackFileStatus.Pending);
      expect(row?.skipNonMusic).toBe(false);
    }
  );

  it('lets a write collaborator of a playlist holding the track fetch it whole', async () => {
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount(database());
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const { trackId } = seedTrack(database(), {
      videoId: VIDEO_ID,
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'boom',
      skipNonMusic: true
    });
    associate(database(), playlistId, trackId);
    const writer = seedAccount(database());
    seedShare(database(), playlistId, writer.accountId, {
      level: ShareLevel.Write
    });

    const response = await post(
      `/api/v1/tracks/${trackId}/fetch-whole`,
      writer.pangolinUserId,
      {}
    );

    expect(response.statusCode).toBe(200);
    expect(TrackSchema.parse(response.json()).skipNonMusic).toBe(false);
  });

  it.each([TrackFileStatus.Stored])(
    'refuses a %s track and leaves it alone',
    async fileStatus => {
      const kick = vi.fn();
      context = await createTestContext(
        {},
        { youtube: createFakeYoutube(), kickDownloads: kick }
      );
      const owner = seedAccount(database());
      const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
      const { trackId } = seedTrack(database(), {
        videoId: VIDEO_ID,
        fileStatus,
        failureReason: null,
        skipNonMusic: true
      });
      associate(database(), playlistId, trackId);

      const response = await post(
        `/api/v1/tracks/${trackId}/fetch-whole`,
        owner.pangolinUserId,
        {}
      );

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ code: 'track_not_fetchable' });
      expect(kick).not.toHaveBeenCalled();
      const row = database()
        .db.select()
        .from(tracks)
        .where(eq(tracks.id, trackId))
        .get();
      expect(row?.fileStatus).toBe(fileStatus);
      /* A stored track's shared file is never re-cut behind the others. */
      expect(row?.skipNonMusic).toBe(true);
    }
  );

  it('answers 404 for a read collaborator, a stranger, an orphan track and a missing track', async () => {
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount(database());
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const { trackId } = seedTrack(database(), {
      videoId: VIDEO_ID,
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'boom',
      skipNonMusic: true
    });
    associate(database(), playlistId, trackId);
    const reader = seedAccount(database());
    seedShare(database(), playlistId, reader.accountId, {
      level: ShareLevel.Read
    });
    const stranger = seedAccount(database());
    const { trackId: orphan } = seedTrack(database(), {
      videoId: 'orphanVideo',
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'boom',
      skipNonMusic: true
    });
    const missing = randomUUID();

    const attempts: [string, string][] = [
      [trackId, reader.pangolinUserId],
      [trackId, stranger.pangolinUserId],
      [orphan, owner.pangolinUserId],
      [missing, owner.pangolinUserId]
    ];

    for (const [targetTrack, pangolinUserId] of attempts) {
      const response = await post(
        `/api/v1/tracks/${targetTrack}/fetch-whole`,
        pangolinUserId,
        {}
      );

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ code: 'track_not_found' });
    }

    // No refused attempt changed the track.
    const row = database()
      .db.select()
      .from(tracks)
      .where(eq(tracks.id, trackId))
      .get();
    expect(row?.fileStatus).toBe(TrackFileStatus.Failed);
    expect(row?.skipNonMusic).toBe(true);
  });

  it('refuses a request without the client header', async () => {
    context = await createTestContext({}, { youtube: createFakeYoutube() });
    const owner = seedAccount(database());
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const { trackId } = seedTrack(database(), {
      videoId: VIDEO_ID,
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'boom',
      skipNonMusic: true
    });
    associate(database(), playlistId, trackId);

    if (context === undefined) {
      throw new Error('the test context is not created');
    }

    const response = await context.app.inject({
      method: 'POST',
      url: `/api/v1/tracks/${trackId}/fetch-whole`,
      headers: { 'remote-user': owner.pangolinUserId },
      payload: {}
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'csrf_header_missing' });
  });
});

/* Cache headers are a contract: media stays out of a shared cache, and reuse
 * is the browser's. Read off a real response so a regression shows here. */
describe('media cache headers', () => {
  it('caches a stored track audio privately for a week', async () => {
    context = await createTestContext();
    const {
      account: { pangolinUserId },
      track: { trackId }
    } = await seedStoredTrack(context, { videoId: 'cache-video-audio' });

    const response = await get(
      `/api/v1/tracks/${trackId}/stream`,
      pangolinUserId
    );

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, max-age=604800');
  });

  it('caches a stored track thumbnail privately for a month', async () => {
    context = await createTestContext();
    const {
      account: { pangolinUserId },
      track: { trackId }
    } = await seedStoredTrack(context, { videoId: 'cache-video-thumbnail' });

    const response = await get(
      `/api/v1/tracks/${trackId}/thumbnail`,
      pangolinUserId
    );

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, max-age=2592000');
  });

  it('never stores a refusal', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());

    const response = await get(
      '/api/v1/tracks/missing/stream',
      owner.pangolinUserId
    );

    expect(response.statusCode).toBe(404);
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
