import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import {
  ShareLevel,
  SyncRunSchema,
  SyncRunStatus
} from '@playliberty/contracts';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';
import {
  seedAccount,
  seedPlaylist,
  seedShare,
  seedSyncRun
} from '../../../app/testing/fixtures.js';

let context: TestContext | undefined;

afterEach(async () => {
  await context?.cleanup();
  context = undefined;
});

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
    const account = seedAccount(context.database);
    const seeded = seedPlaylist(context.database, account.accountId);
    const { runId } = seedSyncRun(context.database, seeded.playlistId, {
      addedCount: 4,
      retainedCount: 12,
      removedCount: 1,
      failedCount: 2,
      startedAt: '2026-09-28T10:00:00.000Z',
      finishedAt: '2026-09-28T10:00:30.000Z'
    });

    const response = await get(seeded.playlistId, account.pangolinUserId);

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
    const account = seedAccount(context.database);
    const seeded = seedPlaylist(context.database, account.accountId);
    seedSyncRun(context.database, seeded.playlistId, {
      status: SyncRunStatus.Failed,
      error: 'The source playlist is unavailable.',
      failedCount: 3,
      finishedAt: '2026-09-28T10:00:30.000Z'
    });

    const response = await get(seeded.playlistId, account.pangolinUserId);

    expect(response.statusCode).toBe(200);
    const parsed = SyncRunSchema.parse(response.json());
    expect(parsed.status).toBe(SyncRunStatus.Failed);
    expect(parsed.error).toBe('The source playlist is unavailable.');
    expect(parsed.failedCount).toBe(3);
  });

  it('returns a run that is still running rather than hiding it', async () => {
    context = await createTestContext();
    const account = seedAccount(context.database);
    const seeded = seedPlaylist(context.database, account.accountId);
    seedSyncRun(context.database, seeded.playlistId, {
      status: SyncRunStatus.Running,
      addedCount: 2,
      finishedAt: null,
      error: null
    });

    const response = await get(seeded.playlistId, account.pangolinUserId);

    expect(response.statusCode).toBe(200);
    const parsed = SyncRunSchema.parse(response.json());
    expect(parsed.status).toBe(SyncRunStatus.Running);
    expect(parsed.finishedAt).toBeNull();
  });

  it('returns the most recent of several runs', async () => {
    context = await createTestContext();
    const account = seedAccount(context.database);
    const seeded = seedPlaylist(context.database, account.accountId);
    seedSyncRun(context.database, seeded.playlistId, {
      addedCount: 1,
      startedAt: '2026-09-20T10:00:00.000Z'
    });
    const { runId: latestId } = seedSyncRun(
      context.database,
      seeded.playlistId,
      {
        addedCount: 9,
        startedAt: '2026-09-28T10:00:00.000Z'
      }
    );
    seedSyncRun(context.database, seeded.playlistId, {
      addedCount: 5,
      startedAt: '2026-09-24T10:00:00.000Z'
    });

    const response = await get(seeded.playlistId, account.pangolinUserId);

    expect(response.statusCode).toBe(200);
    const parsed = SyncRunSchema.parse(response.json());
    expect(parsed.id).toBe(latestId);
    expect(parsed.addedCount).toBe(9);
  });

  it('picks the later insertion when two runs share a start time', async () => {
    context = await createTestContext();
    const account = seedAccount(context.database);
    const seeded = seedPlaylist(context.database, account.accountId);
    const startedAt = '2026-09-28T10:00:00.000Z';
    seedSyncRun(context.database, seeded.playlistId, {
      addedCount: 1,
      startedAt
    });
    const { runId: secondId } = seedSyncRun(
      context.database,
      seeded.playlistId,
      {
        addedCount: 2,
        startedAt
      }
    );

    const first = await get(seeded.playlistId, account.pangolinUserId);
    const second = await get(seeded.playlistId, account.pangolinUserId);

    expect(SyncRunSchema.parse(first.json()).id).toBe(secondId);
    expect(SyncRunSchema.parse(second.json()).id).toBe(secondId);
  });

  it('answers 404 sync_run_absent for a visible playlist that has never synced', async () => {
    context = await createTestContext();
    const account = seedAccount(context.database);
    const seeded = seedPlaylist(context.database, account.accountId);

    const response = await get(seeded.playlistId, account.pangolinUserId);

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
    const { playlistId } = seedPlaylist(
      context.database,
      seedAccount(context.database).accountId
    );
    seedSyncRun(context.database, playlistId, { addedCount: 7 });
    const other = seedAccount(context.database);

    const response = await get(playlistId, other.pangolinUserId);

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      code: 'playlist_not_found',
      status: 404
    });
  });

  it('grants the run through a share, at either level', async () => {
    context = await createTestContext();
    const { playlistId: owned } = seedPlaylist(
      context.database,
      seedAccount(context.database).accountId
    );
    const { runId } = seedSyncRun(context.database, owned, {
      addedCount: 3
    });
    const reader = seedAccount(context.database);
    const writer = seedAccount(context.database);
    seedShare(context.database, owned, reader.accountId);
    seedShare(context.database, owned, writer.accountId, {
      level: ShareLevel.Write
    });

    const readResponse = await get(owned, reader.pangolinUserId);
    const writeResponse = await get(owned, writer.pangolinUserId);

    expect(SyncRunSchema.parse(readResponse.json()).id).toBe(runId);
    expect(SyncRunSchema.parse(writeResponse.json()).id).toBe(runId);
  });
});
