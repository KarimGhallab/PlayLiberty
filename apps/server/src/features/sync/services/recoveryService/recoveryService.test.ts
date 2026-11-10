import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import type { LiveEvent } from '@playliberty/contracts';
import {
  PlaylistSchema,
  PlaylistSyncStatus,
  SyncRunSchema,
  SyncRunStatus,
  TrackFileStatus
} from '@playliberty/contracts';

import type { TestContext } from '../../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../../app/testing/createTestContext.js';
import {
  TEST_SOURCE_ID,
  testEntry as entry,
  createFakeYoutube as fakeYoutube,
  testSource as source
} from '../../../../app/testing/fakeYoutube.js';
import {
  associate,
  seedAccount,
  seedPlaylist,
  seedStoredTrack,
  seedSyncRun,
  seedTrack
} from '../../../../app/testing/fixtures.js';

import {
  associations,
  playlists,
  syncRuns,
  tracks
} from '../../../../platform/database/schema.js';
import {
  mediaRelativePath,
  thumbnailRelativePath
} from '../../../../platform/media/mediaPaths.js';

const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PL1234567890abcdef';
const INTERRUPTION = 'The sync was interrupted by a server restart.';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

function get(url: string, pangolinUserId = 'owner-1') {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'GET',
    url,
    headers: { 'remote-user': pangolinUserId }
  });
}

function postSync(playlistId: string, pangolinUserId = 'owner-1') {
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

async function readPlaylist(playlistId: string) {
  return PlaylistSchema.parse(
    (await get(`/api/v1/playlists/${playlistId}`)).json()
  );
}

async function readLatestRun(playlistId: string) {
  return SyncRunSchema.parse(
    (await get(`/api/v1/playlists/${playlistId}/sync-runs/latest`)).json()
  );
}

async function runFinished(playlistId: string) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const run = await readLatestRun(playlistId);

    if (run.status !== SyncRunStatus.Running) {
      return run;
    }

    await nextTurn();
  }

  throw new Error('the sync run did not finish');
}

function nextTurn(): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setImmediate(resolve);
  return promise;
}

function playlistRow(playlistId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database.db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playlistId))
    .get();
}

function runRow(playlistId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database.db
    .select()
    .from(syncRuns)
    .where(eq(syncRuns.playlistId, playlistId))
    .get();
}

describe('the interrupted sync recovery', () => {
  it('fails a running run and errors a syncing playlist when the app becomes ready', async () => {
    context = await createTestContext(
      {},
      {
        youtube: fakeYoutube(source([entry('a')])),
        startBackgroundJobs: false
      }
    );
    const account = seedAccount(context.database, {
      pangolinUserId: 'owner-1'
    });
    const playlist = seedPlaylist(context.database, account.accountId, {
      sourcePlaylistId: TEST_SOURCE_ID,
      sourceUrl: PLAYLIST_URL,
      syncStatus: PlaylistSyncStatus.Syncing,
      lastSyncedAt: '2026-11-01T00:00:00.000Z'
    });
    seedSyncRun(context.database, playlist.playlistId, {
      status: SyncRunStatus.Running
    });

    const events: LiveEvent[] = [];
    const unsubscribe = context.events.subscribe(account.accountId, event => {
      events.push(event);
    });

    // The first readiness already ran before the stale rows were seeded.
    await context.restart();

    expect(events).toEqual([]);

    const interrupted = await readLatestRun(playlist.playlistId);
    expect(interrupted.status).toBe(SyncRunStatus.Failed);
    expect(interrupted.error).toBe(INTERRUPTION);
    expect(interrupted.finishedAt).not.toBeNull();

    const recovered = await readPlaylist(playlist.playlistId);
    expect(recovered.syncStatus).toBe(PlaylistSyncStatus.Error);
    expect(recovered.lastSyncedAt).toBe('2026-11-01T00:00:00.000Z');

    const playlistBefore = playlistRow(playlist.playlistId);
    const runBefore = runRow(playlist.playlistId);

    // A second boot has no stale rows, so it writes nothing.
    await context.restart();

    expect(events).toEqual([]);
    expect(playlistRow(playlist.playlistId)).toEqual(playlistBefore);
    expect(runRow(playlist.playlistId)).toEqual(runBefore);

    unsubscribe();

    const accepted = await postSync(playlist.playlistId);
    expect(accepted.statusCode).toBe(202);

    const finished = await runFinished(playlist.playlistId);
    expect(finished.status).toBe(SyncRunStatus.Completed);
  });

  it('repairs a syncing playlist without a run and a running run on an idle playlist', async () => {
    context = await createTestContext();
    const account = seedAccount(context.database, {
      pangolinUserId: 'owner-1'
    });
    const syncing = seedPlaylist(context.database, account.accountId, {
      syncStatus: PlaylistSyncStatus.Syncing
    });
    const idle = seedPlaylist(context.database, account.accountId, {
      syncStatus: PlaylistSyncStatus.Idle
    });
    seedSyncRun(context.database, idle.playlistId, {
      status: SyncRunStatus.Running
    });

    await context.restart();

    expect((await readPlaylist(syncing.playlistId)).syncStatus).toBe(
      PlaylistSyncStatus.Error
    );
    expect(
      context.database.db
        .select()
        .from(syncRuns)
        .where(eq(syncRuns.playlistId, syncing.playlistId))
        .all()
    ).toEqual([]);

    expect((await readPlaylist(idle.playlistId)).syncStatus).toBe(
      PlaylistSyncStatus.Idle
    );
    const run = await readLatestRun(idle.playlistId);
    expect(run.status).toBe(SyncRunStatus.Failed);
    expect(run.error).toBe(INTERRUPTION);
    expect(run.finishedAt).not.toBeNull();
  });

  it('leaves a boot with no stale rows unchanged', async () => {
    context = await createTestContext();
    const account = seedAccount(context.database, {
      pangolinUserId: 'owner-1'
    });
    const playlist = seedPlaylist(context.database, account.accountId, {
      syncStatus: PlaylistSyncStatus.Idle,
      lastSyncedAt: '2026-11-01T00:00:00.000Z'
    });
    seedSyncRun(context.database, playlist.playlistId, {
      status: SyncRunStatus.Completed,
      addedCount: 3,
      finishedAt: '2026-11-01T00:00:00.000Z'
    });

    const playlistBefore = playlistRow(playlist.playlistId);
    const runBefore = runRow(playlist.playlistId);

    await context.restart();

    expect(playlistRow(playlist.playlistId)).toEqual(playlistBefore);
    expect(runRow(playlist.playlistId)).toEqual(runBefore);
  });

  it('leaves associations, tracks, files and lastSyncedAt unchanged', async () => {
    context = await createTestContext();
    const account = seedAccount(context.database, {
      pangolinUserId: 'owner-1'
    });
    const playlist = seedPlaylist(context.database, account.accountId, {
      syncStatus: PlaylistSyncStatus.Syncing,
      lastSyncedAt: '2026-11-01T00:00:00.000Z'
    });
    const stored = await seedStoredTrack(context, { account, playlist });
    const pending = seedTrack(context.database, {
      fileStatus: TrackFileStatus.Pending
    });
    associate(context.database, playlist.playlistId, pending.trackId);
    seedSyncRun(context.database, playlist.playlistId, {
      status: SyncRunStatus.Running
    });

    const associationsBefore = context.database.db
      .select()
      .from(associations)
      .all()
      .sort((left, right) => left.id.localeCompare(right.id));
    const tracksBefore = context.database.db
      .select()
      .from(tracks)
      .all()
      .sort((left, right) => left.id.localeCompare(right.id));
    const audioPath = join(
      context.mediaPaths.root,
      mediaRelativePath(stored.track.videoId, '.m4a')
    );
    const thumbnailPath = join(
      context.mediaPaths.root,
      thumbnailRelativePath(stored.track.videoId)
    );

    await context.restart();

    expect(
      context.database.db
        .select()
        .from(associations)
        .all()
        .sort((left, right) => left.id.localeCompare(right.id))
    ).toEqual(associationsBefore);
    expect(
      context.database.db
        .select()
        .from(tracks)
        .all()
        .sort((left, right) => left.id.localeCompare(right.id))
    ).toEqual(tracksBefore);
    await expect(readFile(audioPath, 'utf8')).resolves.toBe('the-audio');
    await expect(readFile(thumbnailPath, 'utf8')).resolves.toBe('the-picture');
    expect(playlistRow(playlist.playlistId)?.lastSyncedAt).toBe(
      '2026-11-01T00:00:00.000Z'
    );
  });
});
