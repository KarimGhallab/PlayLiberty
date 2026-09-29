import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import {
  Provider,
  ShareLevel,
  SyncRunSchema,
  SyncRunStatus,
  UserRole
} from '@playliberty/contracts';

import { createTestContext } from '../../app/testing/createTestContext.js';
import type { TestContext } from '../../app/testing/createTestContext.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import {
  accounts,
  playlists,
  shares,
  syncRuns
} from '../../platform/database/schema.js';

interface SeededAccount {
  accountId: string;
  pangolinUserId: string;
}

interface SeededPlaylist {
  accountId: string;
  pangolinUserId: string;
  playlistId: string;
}

interface SeedRunOptions {
  status?: SyncRunStatus;
  startedAt?: string;
  finishedAt?: string | null;
  error?: string | null;
  addedCount?: number;
  retainedCount?: number;
  removedCount?: number;
  failedCount?: number;
}

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

/*
 * The account is seeded rather than created by the request, so the test knows its
 * id and can own a playlist with it. resolveAccount looks the account up by
 * pangolin_user_id, so the Remote-User header resolves to this row instead of
 * provisioning a second one.
 */
function seedAccount(
  database: DatabaseHandle,
  pangolinUserId = `pangolin-${randomUUID()}`
): SeededAccount {
  const accountId = randomUUID();

  database.db
    .insert(accounts)
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

function seedPlaylist(
  database: DatabaseHandle,
  owner: SeededAccount
): SeededPlaylist {
  const playlistId = randomUUID();

  database.db
    .insert(playlists)
    .values({
      id: playlistId,
      ownerAccountId: owner.accountId,
      name: 'Playlist',
      coverUrl: null,
      provider: Provider.Youtube,
      sourcePlaylistId: `source-${playlistId}`
    })
    .run();

  return { ...owner, playlistId };
}

function seedRun(
  database: DatabaseHandle,
  playlistId: string,
  options: SeedRunOptions = {}
): string {
  const id = randomUUID();

  database.db
    .insert(syncRuns)
    .values({
      id,
      playlistId,
      status: options.status ?? SyncRunStatus.Completed,
      addedCount: options.addedCount ?? 0,
      retainedCount: options.retainedCount ?? 0,
      removedCount: options.removedCount ?? 0,
      failedCount: options.failedCount ?? 0,
      startedAt: options.startedAt ?? '2026-09-28T10:00:00.000Z',
      finishedAt:
        options.finishedAt === undefined
          ? '2026-09-28T10:00:05.000Z'
          : options.finishedAt,
      error: options.error ?? null
    })
    .run();

  return id;
}

function grantShare(
  database: DatabaseHandle,
  playlistId: string,
  accountId: string,
  level: ShareLevel = ShareLevel.Read
): void {
  database.db
    .insert(shares)
    .values({ id: randomUUID(), playlistId, accountId, level })
    .run();
}

function latestUrl(playlistId: string): string {
  return `/api/v1/playlists/${playlistId}/sync-runs/latest`;
}

function get(playlistId: string, pangolinUserId: string) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'GET',
    url: latestUrl(playlistId),
    headers: { 'remote-user': pangolinUserId }
  });
}

describe('GET /playlists/:id/sync-runs/latest', () => {
  it('returns the latest run and the body parses against the contract', async () => {
    context = await createTestContext();
    const seeded = seedPlaylist(
      context.database,
      seedAccount(context.database)
    );
    const runId = seedRun(context.database, seeded.playlistId, {
      addedCount: 4,
      retainedCount: 12,
      removedCount: 1,
      failedCount: 2,
      startedAt: '2026-09-28T10:00:00.000Z',
      finishedAt: '2026-09-28T10:00:30.000Z'
    });

    const response = await get(seeded.playlistId, seeded.pangolinUserId);

    expect(response.statusCode).toBe(200);
    const parsed = SyncRunSchema.parse(response.json());
    expect(parsed).toEqual({
      id: runId,
      playlistId: seeded.playlistId,
      status: SyncRunStatus.Completed,
      addedCount: 4,
      retainedCount: 12,
      removedCount: 1,
      failedCount: 2,
      startedAt: '2026-09-28T10:00:00.000Z',
      finishedAt: '2026-09-28T10:00:30.000Z',
      error: null
    });
  });

  it('returns a failed run with its error rather than treating it as no run', async () => {
    context = await createTestContext();
    const seeded = seedPlaylist(
      context.database,
      seedAccount(context.database)
    );
    seedRun(context.database, seeded.playlistId, {
      status: SyncRunStatus.Failed,
      error: 'The source playlist is unavailable.',
      failedCount: 3,
      finishedAt: '2026-09-28T10:00:30.000Z'
    });

    const response = await get(seeded.playlistId, seeded.pangolinUserId);

    expect(response.statusCode).toBe(200);
    const parsed = SyncRunSchema.parse(response.json());
    expect(parsed.status).toBe(SyncRunStatus.Failed);
    expect(parsed.error).toBe('The source playlist is unavailable.');
    expect(parsed.failedCount).toBe(3);
  });

  it('returns a run that is still running rather than hiding it', async () => {
    context = await createTestContext();
    const seeded = seedPlaylist(
      context.database,
      seedAccount(context.database)
    );
    seedRun(context.database, seeded.playlistId, {
      status: SyncRunStatus.Running,
      addedCount: 2,
      finishedAt: null,
      error: null
    });

    const response = await get(seeded.playlistId, seeded.pangolinUserId);

    expect(response.statusCode).toBe(200);
    const parsed = SyncRunSchema.parse(response.json());
    expect(parsed.status).toBe(SyncRunStatus.Running);
    expect(parsed.finishedAt).toBeNull();
  });

  it('returns the most recent of several runs', async () => {
    context = await createTestContext();
    const seeded = seedPlaylist(
      context.database,
      seedAccount(context.database)
    );
    seedRun(context.database, seeded.playlistId, {
      addedCount: 1,
      startedAt: '2026-09-20T10:00:00.000Z'
    });
    const latestId = seedRun(context.database, seeded.playlistId, {
      addedCount: 9,
      startedAt: '2026-09-28T10:00:00.000Z'
    });
    seedRun(context.database, seeded.playlistId, {
      addedCount: 5,
      startedAt: '2026-09-24T10:00:00.000Z'
    });

    const response = await get(seeded.playlistId, seeded.pangolinUserId);

    expect(response.statusCode).toBe(200);
    const parsed = SyncRunSchema.parse(response.json());
    expect(parsed.id).toBe(latestId);
    expect(parsed.addedCount).toBe(9);
  });

  it('picks the later insertion when two runs share a start time', async () => {
    context = await createTestContext();
    const seeded = seedPlaylist(
      context.database,
      seedAccount(context.database)
    );
    const startedAt = '2026-09-28T10:00:00.000Z';
    seedRun(context.database, seeded.playlistId, { addedCount: 1, startedAt });
    const secondId = seedRun(context.database, seeded.playlistId, {
      addedCount: 2,
      startedAt
    });

    const first = await get(seeded.playlistId, seeded.pangolinUserId);
    const second = await get(seeded.playlistId, seeded.pangolinUserId);

    expect(SyncRunSchema.parse(first.json()).id).toBe(secondId);
    expect(SyncRunSchema.parse(second.json()).id).toBe(secondId);
  });

  it('answers 404 sync_run_absent for a visible playlist that has never synced', async () => {
    context = await createTestContext();
    const seeded = seedPlaylist(
      context.database,
      seedAccount(context.database)
    );

    const response = await get(seeded.playlistId, seeded.pangolinUserId);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: 'sync_run_absent',
      status: 404
    });
  });

  it('answers 404 playlist_not_found for a playlist that does not exist', async () => {
    context = await createTestContext();
    const owner = seedAccount(context.database);

    const response = await get(randomUUID(), owner.pangolinUserId);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: 'playlist_not_found',
      status: 404
    });
  });

  it('answers 404 playlist_not_found rather than 403 for a playlist the account cannot see', async () => {
    context = await createTestContext();
    const stranger = seedPlaylist(
      context.database,
      seedAccount(context.database)
    );
    seedRun(context.database, stranger.playlistId, { addedCount: 7 });
    const other = seedAccount(context.database);

    const response = await get(stranger.playlistId, other.pangolinUserId);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: 'playlist_not_found',
      status: 404
    });
  });

  it('grants the run through a share, at either level', async () => {
    context = await createTestContext();
    const owned = seedPlaylist(context.database, seedAccount(context.database));
    const runId = seedRun(context.database, owned.playlistId, {
      addedCount: 3
    });
    const reader = seedAccount(context.database);
    const writer = seedAccount(context.database);
    grantShare(context.database, owned.playlistId, reader.accountId);
    grantShare(
      context.database,
      owned.playlistId,
      writer.accountId,
      ShareLevel.Write
    );

    const readResponse = await get(owned.playlistId, reader.pangolinUserId);
    const writeResponse = await get(owned.playlistId, writer.pangolinUserId);

    expect(SyncRunSchema.parse(readResponse.json()).id).toBe(runId);
    expect(SyncRunSchema.parse(writeResponse.json()).id).toBe(runId);
  });

  it('requires an identity, so the route cannot be read anonymously', async () => {
    context = await createTestContext();
    const seeded = seedPlaylist(
      context.database,
      seedAccount(context.database)
    );
    seedRun(context.database, seeded.playlistId);

    const response = await context.app.inject({
      method: 'GET',
      url: latestUrl(seeded.playlistId)
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'unauthenticated' });
  });
});
