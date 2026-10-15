import { randomUUID } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  PlaylistSchema,
  ShareSchema,
  UserRole,
  createPageSchema
} from '@playliberty/contracts';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';
import type { SeededAccount } from '../../../app/testing/fixtures.js';
import {
  seedAccount,
  seedPlaylist,
  seedStoredTrack
} from '../../../app/testing/fixtures.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import { shares } from '../../../platform/database/schema.js';

const PlaylistPageSchema = createPageSchema(PlaylistSchema);
const ShareListSchema = z.array(ShareSchema);

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

function revoke(
  playlistId: string,
  account: SeededAccount,
  targetAccountId: string,
  withClientHeader = true
) {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  const headers: Record<string, string> = {
    'remote-user': account.pangolinUserId,
    'remote-name': account.displayName
  };

  if (withClientHeader) {
    headers['x-playliberty-client'] = 'test';
  }

  return context.app.inject({
    method: 'DELETE',
    url: `/api/v1/playlists/${playlistId}/shares/${targetAccountId}`,
    headers
  });
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
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const target = seedAccount(database(), { displayName: 'Bea' });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;

    const granted = await grant(playlistId, owner, target.accountId, 'read');
    expect(granted.statusCode).toBe(200);

    const response = await get(`/api/v1/playlists/${playlistId}/shares`, owner);

    expect(response.statusCode).toBe(200);
    const listed = ShareListSchema.parse(response.json());
    expect(listed).toHaveLength(1);
    expect(listed[0]?.accountId).toBe(target.accountId);
    expect(listed[0]?.account.displayName).toBe('Bea');
    expect(listed[0]?.level).toBe('read');
  });

  it('names the collaborator with no email address and no role', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const target = seedAccount(database(), {
      displayName: 'Bea',
      email: 'bea@example.com',
      role: UserRole.Admin
    });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;

    const granted = await grant(playlistId, owner, target.accountId, 'read');
    expect(granted.statusCode).toBe(200);

    const listed = await get(`/api/v1/playlists/${playlistId}/shares`, owner);
    expect(listed.statusCode).toBe(200);

    // The raw bodies, before any schema strips a field, must not carry the
    // collaborator's email or role, the counterpart of the directory's test.
    for (const body of [granted.json(), listed.json()]) {
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain('@example.com');
      expect(serialized).not.toContain('"email"');
      expect(serialized).not.toContain('"role"');
    }

    ShareListSchema.parse(listed.json());
  });

  it('refuses a read collaborator, a write collaborator and a stranger on both routes', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const reader = seedAccount(database(), { displayName: 'Reader' });
    const writer = seedAccount(database(), { displayName: 'Writer' });
    const stranger = seedAccount(database(), { displayName: 'Stranger' });
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
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const target = seedAccount(database(), { displayName: 'Bea' });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;

    await grant(playlistId, owner, target.accountId, 'read');

    const library = PlaylistPageSchema.parse(
      (await get('/api/v1/playlists', target)).json()
    );
    const found = library.items.find(item => item.id === playlistId);
    expect(found?.access).toBe('read');
  });

  it('changes the level on the same share when a higher level is granted', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const target = seedAccount(database(), { displayName: 'Bea' });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;

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
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;

    const response = await grant(playlistId, owner, owner.accountId, 'read');

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ code: 'self_share' });
    expect(countShares(playlistId)).toBe(0);
  });

  it('refuses a share to an account that does not exist', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;

    const response = await grant(playlistId, owner, randomUUID(), 'read');

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'account_not_found' });
    expect(countShares(playlistId)).toBe(0);
  });

  it('answers 404 for a playlist that does not exist on both routes', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const target = seedAccount(database(), { displayName: 'Bea' });
    const missing = randomUUID();

    const listed = await get(`/api/v1/playlists/${missing}/shares`, owner);
    expect(listed.statusCode).toBe(404);

    const attempted = await grant(missing, owner, target.accountId, 'read');
    expect(attempted.statusCode).toBe(404);
  });

  it('refuses a grant without the client header', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const target = seedAccount(database(), { displayName: 'Bea' });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;

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

describe('DELETE /playlists/:id/shares/:accountId', () => {
  it('revokes a share and it is gone from the listing', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const target = seedAccount(database(), { displayName: 'Bea' });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    await grant(playlistId, owner, target.accountId, 'read');

    const response = await revoke(playlistId, owner, target.accountId);

    expect(response.statusCode).toBe(204);
    expect(countShares(playlistId)).toBe(0);
    const listed = ShareListSchema.parse(
      (await get(`/api/v1/playlists/${playlistId}/shares`, owner)).json()
    );
    expect(listed).toEqual([]);
  });

  it('removes the playlist from the target library, the read and the tracks', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const target = seedAccount(database(), { displayName: 'Bea' });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const { track: storedTrack } = await seedStoredTrack(context, {
      playlist: { playlistId, ownerAccountId: owner.accountId }
    });
    const trackId = storedTrack.trackId;
    await grant(playlistId, owner, target.accountId, 'read');

    // Before revocation the target reaches all four.
    expect(
      (await get(`/api/v1/playlists/${playlistId}`, target)).statusCode
    ).toBe(200);
    expect(
      (await get(`/api/v1/playlists/${playlistId}/tracks`, target)).statusCode
    ).toBe(200);
    expect(
      (await get(`/api/v1/tracks/${trackId}/stream`, target)).statusCode
    ).toBe(200);

    await revoke(playlistId, owner, target.accountId);

    const library = PlaylistPageSchema.parse(
      (await get('/api/v1/playlists', target)).json()
    );
    expect(library.items.find(item => item.id === playlistId)).toBeUndefined();

    const read = await get(`/api/v1/playlists/${playlistId}`, target);
    expect(read.statusCode).toBe(404);
    expect(read.json()).toMatchObject({ code: 'playlist_not_found' });

    const listedTracks = await get(
      `/api/v1/playlists/${playlistId}/tracks`,
      target
    );
    expect(listedTracks.statusCode).toBe(404);

    // The stream and the thumbnail are track routes and keep their own rule: a
    // track the account can no longer reach is forbidden, not missing.
    expect(
      (await get(`/api/v1/tracks/${trackId}/stream`, target)).statusCode
    ).toBe(403);
    expect(
      (await get(`/api/v1/tracks/${trackId}/thumbnail`, target)).statusCode
    ).toBe(403);
  });

  it('revokes a share that is not there, and a target account that does not exist, without changing the playlist', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const target = seedAccount(database(), { displayName: 'Bea' });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    await grant(playlistId, owner, target.accountId, 'read');

    // A different account holds nothing, and a random id holds nothing.
    const outsider = seedAccount(database(), { displayName: 'Outsider' });
    const absent = await revoke(playlistId, owner, outsider.accountId);
    const missingAccount = await revoke(playlistId, owner, randomUUID());

    expect(absent.statusCode).toBe(204);
    expect(missingAccount.statusCode).toBe(204);
    // The share that did exist is untouched.
    expect(countShares(playlistId)).toBe(1);
  });

  it('answers 404 for a write collaborator, a read collaborator and a stranger', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    const reader = seedAccount(database(), { displayName: 'Reader' });
    const writer = seedAccount(database(), { displayName: 'Writer' });
    const stranger = seedAccount(database(), { displayName: 'Stranger' });
    await grant(playlistId, owner, reader.accountId, 'read');
    await grant(playlistId, owner, writer.accountId, 'write');

    for (const account of [reader, writer, stranger]) {
      const response = await revoke(playlistId, account, reader.accountId);
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ code: 'playlist_not_found' });
    }

    expect(countShares(playlistId)).toBe(2);
  });

  it('refuses a revocation without the client header', async () => {
    context = await createTestContext();
    const owner = seedAccount(database(), { displayName: 'Owner' });
    const target = seedAccount(database(), { displayName: 'Bea' });
    const playlistId = seedPlaylist(database(), owner.accountId).playlistId;
    await grant(playlistId, owner, target.accountId, 'read');

    const response = await revoke(playlistId, owner, target.accountId, false);

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'csrf_header_missing' });
    expect(countShares(playlistId)).toBe(1);
  });
});
