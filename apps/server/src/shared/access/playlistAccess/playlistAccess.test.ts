import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShareLevel } from '@playliberty/contracts';

import type { TestContext } from '../../../app/testing/createTestContext.js';
import { createTestContext } from '../../../app/testing/createTestContext.js';
import {
  associate,
  seedAccount,
  seedPlaylist,
  seedShare,
  seedTrack
} from '../../../app/testing/fixtures.js';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import {
  playlistAudience,
  playlistAudiences,
  trackAudience
} from './playlistAccess.js';

let context: TestContext | undefined;

afterEach(async () => {
  vi.restoreAllMocks();
  await context?.cleanup();
  context = undefined;
});

function database(): DatabaseHandle {
  if (context === undefined) {
    throw new Error('the test context is not created');
  }

  return context.database;
}

function byAccount(
  audiences: readonly {
    readonly accountId: string;
    readonly playlistIds: string[];
  }[]
): Map<string, string[]> {
  return new Map(
    audiences.map(({ accountId, playlistIds }) => [accountId, playlistIds])
  );
}

describe('the playlist audience resolver', () => {
  it('groups each account with the playlists it may hear about, in the named order', async () => {
    context = await createTestContext();
    const ownerA = seedAccount(database());
    const ownerB = seedAccount(database());
    const collaborator = seedAccount(database());
    const a = seedPlaylist(database(), ownerA.accountId).playlistId;
    const b = seedPlaylist(database(), ownerB.accountId).playlistId;
    seedShare(database(), a, collaborator.accountId);
    seedShare(database(), b, collaborator.accountId, {
      level: ShareLevel.Write
    });

    const audiences = playlistAudiences(database(), [b, a]);
    const resolved = byAccount(audiences);

    expect(audiences).toHaveLength(3);
    expect(resolved.get(ownerA.accountId)).toEqual([a]);
    expect(resolved.get(ownerB.accountId)).toEqual([b]);
    expect(resolved.get(collaborator.accountId)).toEqual([b, a]);
  });

  it('drops a playlist that does not exist, and an empty batch asks nothing', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);

    expect(playlistAudiences(database(), [])).toEqual([]);
    expect(playlistAudiences(database(), [playlistId, 'missing'])).toEqual([
      { accountId: owner.accountId, playlistIds: [playlistId] }
    ]);
  });

  it('projects one playlist to its account ids, owner first', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const collaborator = seedAccount(database());
    const { playlistId } = seedPlaylist(database(), owner.accountId);
    seedShare(database(), playlistId, collaborator.accountId);

    expect(playlistAudience(database(), playlistId)).toEqual([
      owner.accountId,
      collaborator.accountId
    ]);
  });

  it('projects a track through its holding playlists', async () => {
    context = await createTestContext();
    const ownerA = seedAccount(database());
    const ownerB = seedAccount(database());
    const collaborator = seedAccount(database());
    const a = seedPlaylist(database(), ownerA.accountId).playlistId;
    const b = seedPlaylist(database(), ownerB.accountId).playlistId;
    seedShare(database(), a, collaborator.accountId);
    seedShare(database(), b, collaborator.accountId, {
      level: ShareLevel.Write
    });
    const { trackId } = seedTrack(database());
    associate(database(), a, trackId);
    associate(database(), b, trackId);

    const resolved = byAccount(trackAudience(database(), trackId));

    expect(new Set(resolved.get(ownerA.accountId))).toEqual(new Set([a]));
    expect(new Set(resolved.get(ownerB.accountId))).toEqual(new Set([b]));
    expect(new Set(resolved.get(collaborator.accountId))).toEqual(
      new Set([a, b])
    );
  });

  it('reads the whole batch in one query', async () => {
    context = await createTestContext();
    const owner = seedAccount(database());
    const playlistIds = [
      seedPlaylist(database(), owner.accountId).playlistId,
      seedPlaylist(database(), owner.accountId).playlistId,
      seedPlaylist(database(), owner.accountId).playlistId
    ];
    const select = vi.spyOn(database().db, 'select');

    playlistAudiences(database(), playlistIds);

    expect(select).toHaveBeenCalledTimes(1);
  });
});
