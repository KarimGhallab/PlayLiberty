import { describe, expect, it } from 'vitest';

import type { PlaylistWithCounts } from '@playliberty/contracts';
import { PlaylistSort, PlaylistSyncStatus, Provider } from '@playliberty/contracts';

import { bulkSyncSettled, bulkSyncStatus } from './bulkSync.js';

const counts = {
  stored: 0,
  pending: 0,
  downloading: 0,
  failed: 0,
  unavailable: 0
};

const base: PlaylistWithCounts = {
  id: 'base',
  ownerAccountId: 'account-1',
  name: 'Base',
  coverTrackId: null,
  coverUpdatedAt: null,
  provider: Provider.Youtube,
  sourcePlaylistId: 'PL-base',
  syncStatus: PlaylistSyncStatus.Idle,
  lastSyncedAt: null,
  trackCount: 1,
  skipNonMusic: true,
  sort: PlaylistSort.Playlist,
  access: 'owner',
  hasShares: false,
  pinned: false,
  counts,
  remoteRemoved: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z'
};

function playlist(
  id: string,
  overrides: Partial<PlaylistWithCounts> = {}
): PlaylistWithCounts {
  return { ...base, id, ...overrides };
}

describe('the bulk sync batch', () => {
  it('freezes the pressed count while the batch runs', () => {
    const batch = { ids: ['a', 'b', 'c'], at: 10 };
    const items = [
      playlist('a', { syncStatus: PlaylistSyncStatus.Syncing }),
      playlist('b', { syncStatus: PlaylistSyncStatus.Syncing }),
      playlist('c', { syncStatus: PlaylistSyncStatus.Syncing })
    ];

    expect(bulkSyncStatus(batch, items, 10, true, 0)).toEqual({
      busy: true,
      count: 3
    });
  });

  it('follows the syncable set until a press freezes it', () => {
    expect(bulkSyncStatus(null, [], 0, false, 2)).toEqual({
      busy: false,
      count: 2
    });
  });

  it('settles only after the loop ends and a read taken after the press lands', () => {
    const batch = { ids: ['a'], at: 10 };
    const syncing = [playlist('a', { syncStatus: PlaylistSyncStatus.Syncing })];
    const idle = [playlist('a')];

    expect(bulkSyncSettled(batch, syncing, 9, false)).toBe(false);
    expect(bulkSyncSettled(batch, syncing, 11, false)).toBe(false);
    expect(bulkSyncSettled(batch, idle, 10, false)).toBe(false);
    expect(bulkSyncSettled(batch, idle, 11, true)).toBe(false);
    expect(bulkSyncSettled(batch, idle, 11, false)).toBe(true);
    expect(bulkSyncSettled(null, idle, 11, false)).toBe(false);
  });
});
