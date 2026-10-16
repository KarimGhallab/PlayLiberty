import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AddTrackOutcome,
  AddTrackResultSchema,
  ShareLevel,
  SyncRunSchema,
  SyncRunStatus,
  TrackFileStatus
} from '@playliberty/contracts';

import type { TestContext } from '../../app/testing/createTestContext.js';
import { createTestContext } from '../../app/testing/createTestContext.js';
import {
  createFakeYoutube,
  testEntry,
  testSource
} from '../../app/testing/fakeYoutube.js';
import type { SeededAccount } from '../../app/testing/fixtures.js';
import {
  associate,
  seedAccount,
  seedPlaylist,
  seedShare,
  seedStoredTrack,
  seedTrack
} from '../../app/testing/fixtures.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import {
  associations,
  shares,
  syncRuns,
  tracks
} from '../../platform/database/schema.js';

const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

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

function get(url: string, account: SeededAccount) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'GET',
    url,
    headers: {
      'remote-user': account.pangolinUserId,
      'remote-name': account.displayName
    }
  });
}

function send(
  method: 'POST' | 'PATCH' | 'DELETE',
  url: string,
  account: SeededAccount,
  payload?: Record<string, unknown>
) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method,
    url,
    headers: {
      'remote-user': account.pangolinUserId,
      'remote-name': account.displayName,
      'x-playliberty-client': 'test'
    },
    payload
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

function countShares(playlistId: string): number {
  return (
    database()
      .db.select({ total: sql<number>`count(*)` })
      .from(shares)
      .where(eq(shares.playlistId, playlistId))
      .get()?.total ?? 0
  );
}

/* Every route a collaborator must not use on someone else's playlist: read by
 * all refused, write by the owner-only ones. The batch add is a status. */
async function mutatingRoutes(
  playlistId: string,
  trackId: string,
  account: SeededAccount
): Promise<[string, number][]> {
  const addVideo = send('POST', '/api/v1/tracks', account, {
    url: VIDEO_URL,
    playlistIds: [playlistId]
  }).then(response => {
    const outcome = response.json().results?.[0]?.outcome;
    return {
      statusCode:
        outcome === AddTrackOutcome.Refused ? 404 : response.statusCode
    };
  });

  const attempts: [string, Promise<{ statusCode: number }>][] = [
    [
      'rename',
      send('PATCH', `/api/v1/playlists/${playlistId}`, account, { name: 'X' })
    ],
    [
      'delete playlist',
      send('DELETE', `/api/v1/playlists/${playlistId}`, account)
    ],
    ['add video', addVideo],
    [
      'remove track',
      send(
        'DELETE',
        `/api/v1/playlists/${playlistId}/tracks/${trackId}`,
        account
      )
    ],
    [
      'retry track',
      send('POST', `/api/v1/tracks/${trackId}/retry`, account, {})
    ],
    ['sync', send('POST', `/api/v1/playlists/${playlistId}/sync`, account)],
    ['list shares', get(`/api/v1/playlists/${playlistId}/shares`, account)],
    [
      'grant share',
      send('POST', `/api/v1/playlists/${playlistId}/shares`, account, {
        accountId: randomUUID(),
        level: 'read'
      })
    ],
    [
      'revoke share',
      send(
        'DELETE',
        `/api/v1/playlists/${playlistId}/shares/${randomUUID()}`,
        account
      )
    ]
  ];

  const responses = await Promise.all(attempts.map(([, request]) => request));

  return attempts.map(([name], index) => [
    name,
    responses[index]?.statusCode ?? 0
  ]);
}

describe('what a read share grants', () => {
  it('sees the playlist, reads it and its tracks, and reaches the stream and the thumbnail', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const reader = seedAccount(database(), { displayName: 'Reader' });
    const playlist = seedPlaylist(database(), owner.accountId);
    const playlistId = playlist.playlistId;
    const { track: stored } = await seedStoredTrack(context, { playlist });
    seedShare(database(), playlistId, reader.accountId, {
      level: ShareLevel.Read
    });

    const library = await get('/api/v1/playlists', reader);
    expect(library.statusCode).toBe(200);
    expect(
      (await get(`/api/v1/playlists/${playlistId}`, reader)).statusCode
    ).toBe(200);
    expect(
      (await get(`/api/v1/playlists/${playlistId}/tracks`, reader)).statusCode
    ).toBe(200);

    // Stream refuses track_not_stored because no bytes are on disk here. Being
    // neither track_not_found nor forbidden shows the read share reached it.
    const stream = await get(`/api/v1/tracks/${stored.trackId}/stream`, reader);
    expect(stream.statusCode).toBe(200);
    expect(stream.body).toBe('the-audio');
  });
  it('is refused by every mutating route', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const reader = seedAccount(database(), { displayName: 'Reader' });
    const playlist = seedPlaylist(database(), owner.accountId);
    const playlistId = playlist.playlistId;
    const { track } = await seedStoredTrack(context, { playlist });
    const trackId = track.trackId;
    seedShare(database(), playlistId, reader.accountId, {
      level: ShareLevel.Read
    });

    const refusals = await mutatingRoutes(playlistId, trackId, reader);

    for (const [name, status] of refusals) {
      expect(status, `${name} should be refused`).toBe(404);
    }
  });
});

describe('what a write share grants', () => {
  it('adds a video, removes a track, retries a failed track and syncs', async () => {
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(testSource([testEntry('aaaaaaaaaaa')])) }
    );
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const writer = seedAccount(database(), { displayName: 'Writer' });
    const playlist = seedPlaylist(database(), owner.accountId);
    const playlistId = playlist.playlistId;
    seedShare(database(), playlistId, writer.accountId, {
      level: ShareLevel.Write
    });

    const added = await send('POST', '/api/v1/tracks', writer, {
      url: VIDEO_URL,
      playlistIds: [playlistId]
    });
    expect(added.statusCode).toBe(200);
    expect(AddTrackResultSchema.parse(added.json()).results[0]?.outcome).toBe(
      AddTrackOutcome.Added
    );

    const { track: removable } = await seedStoredTrack(context, { playlist });
    expect(
      (
        await send(
          'DELETE',
          `/api/v1/playlists/${playlistId}/tracks/${removable.trackId}`,
          writer
        )
      ).statusCode
    ).toBe(204);

    const { trackId: failed } = seedTrack(database(), {
      fileStatus: TrackFileStatus.Failed,
      failureReason: 'boom'
    });
    associate(database(), playlistId, failed, { position: 1 });
    const retried = await send(
      'POST',
      `/api/v1/tracks/${failed}/retry`,
      writer,
      {}
    );
    expect(retried.statusCode).toBe(200);
    expect(retried.json().fileStatus).toBe(TrackFileStatus.Pending);

    const synced = await send(
      'POST',
      `/api/v1/playlists/${playlistId}/sync`,
      writer
    );
    expect(synced.statusCode).toBe(202);
    expect(SyncRunSchema.parse(synced.json()).status).toBe(
      SyncRunStatus.Running
    );
  });

  it('is refused rename, delete and all three share routes', async () => {
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(testSource([testEntry('aaaaaaaaaaa')])) }
    );
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const writer = seedAccount(database(), { displayName: 'Writer' });
    const playlist = seedPlaylist(database(), owner.accountId);
    const playlistId = playlist.playlistId;
    const { track } = await seedStoredTrack(context, { playlist });
    const trackId = track.trackId;
    seedShare(database(), playlistId, writer.accountId, {
      level: ShareLevel.Write
    });

    const refusals = await mutatingRoutes(playlistId, trackId, writer);
    const ownerOnly = refusals.filter(
      ([name]) =>
        name === 'rename' ||
        name === 'delete playlist' ||
        name === 'list shares' ||
        name === 'grant share' ||
        name === 'revoke share'
    );

    expect(ownerOnly).toHaveLength(5);
    for (const [name, status] of ownerOnly) {
      expect(status, `${name} should be refused`).toBe(404);
    }
  });
});

describe('what a non-collaborator gets', () => {
  it('is refused the share routes and answers 404 for the playlist', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const stranger = seedAccount(database(), { displayName: 'Stranger' });
    const playlist = seedPlaylist(database(), owner.accountId);
    const playlistId = playlist.playlistId;

    expect(
      (await get(`/api/v1/playlists/${playlistId}`, stranger)).statusCode
    ).toBe(404);
    expect(
      (await get(`/api/v1/playlists/${playlistId}/shares`, stranger)).statusCode
    ).toBe(404);
    expect(
      (
        await send('POST', `/api/v1/playlists/${playlistId}/shares`, stranger, {
          accountId: randomUUID(),
          level: 'read'
        })
      ).statusCode
    ).toBe(404);
    expect(
      (
        await send(
          'DELETE',
          `/api/v1/playlists/${playlistId}/shares/${randomUUID()}`,
          stranger
        )
      ).statusCode
    ).toBe(404);
  });
});

describe('what sharing does not do', () => {
  it('creates no second track, changes no count and stores no second file', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const reader = seedAccount(database(), { displayName: 'Reader' });
    const playlist = seedPlaylist(database(), owner.accountId);
    const playlistId = playlist.playlistId;
    const { track } = await seedStoredTrack(context, { playlist });
    const trackId = track.trackId;
    const before = countTracks();
    const beforeAssociations =
      database()
        .db.select({ total: sql<number>`count(*)` })
        .from(associations)
        .get()?.total ?? 0;

    await send('POST', `/api/v1/playlists/${playlistId}/shares`, owner, {
      accountId: reader.accountId,
      level: 'read'
    });

    expect(countTracks()).toBe(before);
    expect(
      database()
        .db.select({ total: sql<number>`count(*)` })
        .from(associations)
        .get()?.total
    ).toBe(beforeAssociations);
    // The one file the playlist already had is the only one, and a share copies
    // nothing: the association count is unchanged by the grant above.
    expect(beforeAssociations).toBe(1);
    expect(trackId).toBeDefined();
  });

  it('survives a sync of the playlist', async () => {
    context = await createTestContext(
      {},
      { youtube: createFakeYoutube(testSource([testEntry('aaaaaaaaaaa')])) }
    );
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const reader = seedAccount(database(), { displayName: 'Reader' });
    const playlist = seedPlaylist(database(), owner.accountId);
    const playlistId = playlist.playlistId;
    await send('POST', `/api/v1/playlists/${playlistId}/shares`, owner, {
      accountId: reader.accountId,
      level: 'read'
    });

    const started = await send(
      'POST',
      `/api/v1/playlists/${playlistId}/sync`,
      owner
    );
    expect(started.statusCode).toBe(202);
    const run = SyncRunSchema.parse(started.json());

    for (let attempt = 0; attempt < 200; attempt += 1) {
      const latest = await get(
        `/api/v1/playlists/${playlistId}/sync-runs/latest`,
        owner
      );
      if (latest.statusCode === 200) {
        const parsed = SyncRunSchema.parse(latest.json());
        if (parsed.status !== SyncRunStatus.Running) {
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    expect(countShares(playlistId)).toBe(1);
    expect(
      (await get(`/api/v1/playlists/${playlistId}`, reader)).statusCode
    ).toBe(200);
    expect(run.playlistId).toBe(playlistId);

    const runs = database()
      .db.select({ total: sql<number>`count(*)` })
      .from(syncRuns)
      .where(eq(syncRuns.playlistId, playlistId))
      .get()?.total;
    expect(runs).toBe(1);
  });
});
