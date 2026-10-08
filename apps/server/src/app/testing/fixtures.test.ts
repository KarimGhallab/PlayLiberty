import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AssociationOrigin,
  PlaylistSyncStatus,
  ShareLevel,
  SyncRunStatus,
  TrackFileStatus,
  TrackSourceStatus,
  UserRole
} from '@playliberty/contracts';

import {
  accounts,
  associations,
  playlists,
  shares,
  syncRuns,
  tracks
} from '../../platform/database/schema.js';
import type { TestContext } from './createTestContext.js';
import { createTestContext } from './createTestContext.js';
import {
  associate,
  seedAccount,
  seedPlaylist,
  seedShare,
  seedStoredTrack,
  seedSyncRun,
  seedTrack
} from './fixtures.js';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

async function create(): Promise<TestContext> {
  context = await createTestContext();

  return context;
}

describe('seedAccount', () => {
  it('inserts a user account and returns its ids', async () => {
    const { database } = await create();

    const account = seedAccount(database);
    const row = database.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, account.accountId))
      .get();

    expect(row?.displayName).toBe('Account');
    expect(row?.role).toBe(UserRole.User);
    expect(row?.email).toBeNull();
    expect(row?.pangolinUserId).toBe(account.pangolinUserId);
    expect(account.pangolinUserId).toBe(`pangolin-${account.accountId}`);
  });

  it('takes the display name, role, email and pangolin id', async () => {
    const { database } = await create();

    const account = seedAccount(database, {
      displayName: 'Owner',
      pangolinUserId: 'owner-1',
      email: 'owner@example.com',
      role: UserRole.Admin
    });
    const row = database.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, account.accountId))
      .get();

    expect(row?.role).toBe(UserRole.Admin);
    expect(row?.email).toBe('owner@example.com');
  });
});

describe('seedPlaylist', () => {
  it('inserts an idle, skip-non-music playlist owned by the account', async () => {
    const { database } = await create();
    const { accountId } = seedAccount(database);

    const playlist = seedPlaylist(database, accountId);
    const row = database.db
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlist.playlistId))
      .get();

    expect(playlist.ownerAccountId).toBe(accountId);
    expect(row?.syncStatus).toBe(PlaylistSyncStatus.Idle);
    expect(row?.skipNonMusic).toBe(true);
    expect(row?.lastSyncedAt).toBeNull();
    expect(row?.sourcePlaylistId).toBe(`source-${playlist.playlistId}`);
  });

  it('takes the name, source, status and setting', async () => {
    const { database } = await create();
    const { accountId } = seedAccount(database);

    const playlist = seedPlaylist(database, accountId, {
      name: 'Road trip',
      sourcePlaylistId: 'PL42',
      syncStatus: PlaylistSyncStatus.Error,
      skipNonMusic: false,
      lastSyncedAt: '2026-09-28T10:00:00.000Z'
    });
    const row = database.db
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlist.playlistId))
      .get();

    expect(row?.name).toBe('Road trip');
    expect(row?.sourcePlaylistId).toBe('PL42');
    expect(row?.syncStatus).toBe(PlaylistSyncStatus.Error);
    expect(row?.skipNonMusic).toBe(false);
    expect(row?.lastSyncedAt).toBe('2026-09-28T10:00:00.000Z');
  });
});

describe('seedTrack', () => {
  it('inserts a stored track with no association', async () => {
    const { database } = await create();

    const track = seedTrack(database);
    const row = database.db
      .select()
      .from(tracks)
      .where(eq(tracks.id, track.trackId))
      .get();

    expect(track.videoId).toBe(`video-${track.trackId}`);
    expect(row?.title).toBe('Track');
    expect(row?.durationSeconds).toBe(180);
    expect(row?.fileStatus).toBe(TrackFileStatus.Stored);
    expect(row?.sourceStatus).toBe(TrackSourceStatus.Available);
    expect(row?.skipNonMusic).toBe(true);

    const memberships = database.db
      .select()
      .from(associations)
      .where(eq(associations.trackId, track.trackId))
      .all();

    expect(memberships).toHaveLength(0);
  });

  it('takes the video id, title, status and failure reason', async () => {
    const { database } = await create();

    const track = seedTrack(database, {
      videoId: 'aaaaaaaaaaa',
      title: 'A song',
      durationSeconds: null,
      fileStatus: TrackFileStatus.Failed,
      sourceStatus: TrackSourceStatus.Removed,
      skipNonMusic: false,
      failureReason: 'boom'
    });
    const row = database.db
      .select()
      .from(tracks)
      .where(eq(tracks.id, track.trackId))
      .get();

    expect(track.videoId).toBe('aaaaaaaaaaa');
    expect(row?.title).toBe('A song');
    expect(row?.durationSeconds).toBeNull();
    expect(row?.fileStatus).toBe(TrackFileStatus.Failed);
    expect(row?.sourceStatus).toBe(TrackSourceStatus.Removed);
    expect(row?.skipNonMusic).toBe(false);
    expect(row?.failureReason).toBe('boom');
  });
});

describe('associate', () => {
  it('appends the track after the highest position, as remote', async () => {
    const { database } = await create();
    const { accountId } = seedAccount(database);
    const playlist = seedPlaylist(database, accountId);
    const first = seedTrack(database, { videoId: 'aaaaaaaaaaa' });
    const second = seedTrack(database, { videoId: 'bbbbbbbbbbb' });

    associate(database, playlist.playlistId, first.trackId);
    associate(database, playlist.playlistId, second.trackId);

    const rows = database.db
      .select()
      .from(associations)
      .where(eq(associations.playlistId, playlist.playlistId))
      .all();

    expect(rows.map(row => row.position).sort()).toEqual([0, 1]);
    expect(rows.every(row => row.origin === AssociationOrigin.Remote)).toBe(
      true
    );
  });

  it('takes an origin and a position', async () => {
    const { database } = await create();
    const { accountId } = seedAccount(database);
    const playlist = seedPlaylist(database, accountId);
    const track = seedTrack(database);

    associate(database, playlist.playlistId, track.trackId, {
      origin: AssociationOrigin.Manual,
      position: 7
    });

    const row = database.db.select().from(associations).get();

    expect(row?.origin).toBe(AssociationOrigin.Manual);
    expect(row?.position).toBe(7);
  });
});

describe('seedShare', () => {
  it('grants a read share by default', async () => {
    const { database } = await create();
    const owner = seedAccount(database, { displayName: 'Owner' });
    const reader = seedAccount(database, { displayName: 'Reader' });
    const playlist = seedPlaylist(database, owner.accountId);

    seedShare(database, playlist.playlistId, reader.accountId);

    const row = database.db.select().from(shares).get();

    expect(row?.level).toBe(ShareLevel.Read);
    expect(row?.accountId).toBe(reader.accountId);
  });

  it('takes the level', async () => {
    const { database } = await create();
    const owner = seedAccount(database);
    const writer = seedAccount(database);
    const playlist = seedPlaylist(database, owner.accountId);

    seedShare(database, playlist.playlistId, writer.accountId, {
      level: ShareLevel.Write
    });

    expect(database.db.select().from(shares).get()?.level).toBe(
      ShareLevel.Write
    );
  });
});

describe('seedSyncRun', () => {
  it('inserts a completed run with zero counts', async () => {
    const { database } = await create();
    const { accountId } = seedAccount(database);
    const playlist = seedPlaylist(database, accountId);

    const { runId } = seedSyncRun(database, playlist.playlistId);
    const row = database.db
      .select()
      .from(syncRuns)
      .where(eq(syncRuns.id, runId))
      .get();

    expect(row?.status).toBe(SyncRunStatus.Completed);
    expect(row?.addedCount).toBe(0);
    expect(row?.finishedAt).toBeNull();
  });

  it('takes the status, counts and error', async () => {
    const { database } = await create();
    const { accountId } = seedAccount(database);
    const playlist = seedPlaylist(database, accountId);

    const { runId } = seedSyncRun(database, playlist.playlistId, {
      status: SyncRunStatus.Failed,
      addedCount: 3,
      failedCount: 1,
      error: 'boom'
    });
    const row = database.db
      .select()
      .from(syncRuns)
      .where(eq(syncRuns.id, runId))
      .get();

    expect(row?.status).toBe(SyncRunStatus.Failed);
    expect(row?.addedCount).toBe(3);
    expect(row?.failedCount).toBe(1);
    expect(row?.error).toBe('boom');
  });
});

describe('seedStoredTrack', () => {
  it('creates the chain and writes the two media files', async () => {
    const testContext = await create();

    const { account, playlist, track } = await seedStoredTrack(testContext);
    const row = testContext.database.db
      .select()
      .from(tracks)
      .where(eq(tracks.id, track.trackId))
      .get();

    expect(row?.fileStatus).toBe(TrackFileStatus.Stored);
    expect(row?.filePath).not.toBeNull();
    expect(row?.thumbnailPath).not.toBeNull();

    const audio = await readFile(
      join(testContext.mediaPaths.root, row?.filePath ?? ''),
      'utf8'
    );
    const thumbnail = await stat(
      join(testContext.mediaPaths.root, row?.thumbnailPath ?? '')
    );

    expect(audio).toBe('the-audio');
    expect(thumbnail.isFile()).toBe(true);

    const membership = testContext.database.db
      .select()
      .from(associations)
      .where(eq(associations.trackId, track.trackId))
      .get();

    expect(membership?.playlistId).toBe(playlist.playlistId);
    expect(playlist.ownerAccountId).toBe(account.accountId);
  });

  it('uses the account and playlist it is given', async () => {
    const testContext = await create();
    const account = seedAccount(testContext.database, { displayName: 'Owner' });
    const playlist = seedPlaylist(testContext.database, account.accountId, {
      name: 'Existing'
    });

    const seeded = await seedStoredTrack(testContext, {
      account,
      playlist,
      videoId: 'ccccccccccc'
    });

    expect(seeded.account.accountId).toBe(account.accountId);
    expect(seeded.playlist.playlistId).toBe(playlist.playlistId);
    expect(seeded.track.videoId).toBe('ccccccccccc');
  });
});
