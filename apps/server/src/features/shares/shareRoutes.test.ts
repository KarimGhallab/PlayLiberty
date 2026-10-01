import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  PlaylistSchema,
  Provider,
  ShareSchema,
  UserRole,
  createPageSchema
} from '@playliberty/contracts';

import { createTestContext } from '../../app/testing/createTestContext.js';
import type { TestContext } from '../../app/testing/createTestContext.js';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { accounts, playlists, shares } from '../../platform/database/schema.js';

const PlaylistPageSchema = createPageSchema(PlaylistSchema);
const ShareListSchema = z.array(ShareSchema);

interface SeededAccount {
  accountId: string;
  pangolinUserId: string;
  displayName: string;
}

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

function seedAccount(displayName: string): SeededAccount {
  const accountId = randomUUID();
  const pangolinUserId = `pangolin-${accountId}`;

  database()
    .db.insert(accounts)
    .values({
      id: accountId,
      pangolinUserId,
      displayName,
      email: null,
      avatarUrl: null,
      role: UserRole.User
    })
    .run();

  return { accountId, pangolinUserId, displayName };
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

function post(
  url: string,
  account: SeededAccount,
  payload: Record<string, unknown>
) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.app.inject({
    method: 'POST',
    url,
    headers: {
      'remote-user': account.pangolinUserId,
      'remote-name': account.displayName,
      'x-playliberty-client': 'test'
    },
    payload
  });
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

function grant(
  playlistId: string,
  owner: SeededAccount,
  targetAccountId: string,
  level: string
) {
  return post(`/api/v1/playlists/${playlistId}/shares`, owner, {
    accountId: targetAccountId,
    level
  });
}

describe('GET and POST /playlists/:id/shares', () => {
  it('lists the shares to the owner with the account, the level and the time', async () => {
    context = await createTestContext();
    const owner = seedAccount('Owner');
    const target = seedAccount('Bea');
    const playlistId = seedPlaylist(owner.accountId);

    const granted = await grant(playlistId, owner, target.accountId, 'read');
    expect(granted.statusCode).toBe(200);

    const response = await get(`/api/v1/playlists/${playlistId}/shares`, owner);

    expect(response.statusCode).toBe(200);
    const listed = ShareListSchema.parse(response.json());
    expect(listed).toHaveLength(1);
    expect(listed[0]?.accountId).toBe(target.accountId);
    expect(listed[0]?.account.displayName).toBe('Bea');
    expect(listed[0]?.level).toBe('read');
    expect(typeof listed[0]?.createdAt).toBe('string');
  });

  it('refuses a read collaborator, a write collaborator and a stranger on both routes', async () => {
    context = await createTestContext();
    const owner = seedAccount('Owner');
    const playlistId = seedPlaylist(owner.accountId);
    const reader = seedAccount('Reader');
    const writer = seedAccount('Writer');
    const stranger = seedAccount('Stranger');
    await grant(playlistId, owner, reader.accountId, 'read');
    await grant(playlistId, owner, writer.accountId, 'write');

    for (const account of [reader, writer, stranger]) {
      const listed = await get(
        `/api/v1/playlists/${playlistId}/shares`,
        account
      );
      expect(listed.statusCode).toBe(404);
      expect(listed.json()).toMatchObject({ code: 'playlist_not_found' });

      const attempted = await grant(
        playlistId,
        account,
        stranger.accountId,
        'read'
      );
      expect(attempted.statusCode).toBe(404);
    }
  });

  it('grants read and the target sees the playlist in its library with read access', async () => {
    context = await createTestContext();
    const owner = seedAccount('Owner');
    const target = seedAccount('Bea');
    const playlistId = seedPlaylist(owner.accountId);

    await grant(playlistId, owner, target.accountId, 'read');

    const library = PlaylistPageSchema.parse(
      (await get('/api/v1/playlists', target)).json()
    );
    const found = library.items.find(item => item.id === playlistId);
    expect(found?.access).toBe('read');
  });

  it('changes the level on the same share when a higher level is granted', async () => {
    context = await createTestContext();
    const owner = seedAccount('Owner');
    const target = seedAccount('Bea');
    const playlistId = seedPlaylist(owner.accountId);

    await grant(playlistId, owner, target.accountId, 'read');
    await grant(playlistId, owner, target.accountId, 'write');

    const listed = ShareListSchema.parse(
      (await get(`/api/v1/playlists/${playlistId}/shares`, owner)).json()
    );
    expect(listed).toHaveLength(1);
    expect(listed[0]?.accountId).toBe(target.accountId);
    expect(listed[0]?.level).toBe('write');
    expect(countShares(playlistId)).toBe(1);
  });

  it('refuses a share to the account that owns the playlist', async () => {
    context = await createTestContext();
    const owner = seedAccount('Owner');
    const playlistId = seedPlaylist(owner.accountId);

    const response = await grant(playlistId, owner, owner.accountId, 'read');

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ code: 'self_share' });
    expect(countShares(playlistId)).toBe(0);
  });

  it('refuses a share to an account that does not exist', async () => {
    context = await createTestContext();
    const owner = seedAccount('Owner');
    const playlistId = seedPlaylist(owner.accountId);

    const response = await grant(playlistId, owner, randomUUID(), 'read');

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'account_not_found' });
    expect(countShares(playlistId)).toBe(0);
  });

  it('answers 404 for a playlist that does not exist on both routes', async () => {
    context = await createTestContext();
    const owner = seedAccount('Owner');
    const target = seedAccount('Bea');
    const missing = randomUUID();

    const listed = await get(`/api/v1/playlists/${missing}/shares`, owner);
    expect(listed.statusCode).toBe(404);

    const attempted = await grant(missing, owner, target.accountId, 'read');
    expect(attempted.statusCode).toBe(404);
  });

  it('refuses a grant without the client header', async () => {
    context = await createTestContext();
    const owner = seedAccount('Owner');
    const target = seedAccount('Bea');
    const playlistId = seedPlaylist(owner.accountId);

    const response = await context.app.inject({
      method: 'POST',
      url: `/api/v1/playlists/${playlistId}/shares`,
      headers: { 'remote-user': owner.pangolinUserId },
      payload: { accountId: target.accountId, level: 'read' }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'csrf_header_missing' });
  });
});
