import type { InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import type { PlaylistPage, PlaylistWithCounts } from '@playliberty/contracts';
import {
  PlaylistSort,
  PlaylistSyncStatus,
  Provider
} from '@playliberty/contracts';

import { insertPlaylistInPages, pinPlaylistInPages } from './libraryPages.js';

const ITEM: PlaylistWithCounts = {
  id: 'p1',
  ownerAccountId: 'a1',
  name: 'Morning',
  coverTrackId: null,
  coverUpdatedAt: null,
  provider: Provider.Youtube,
  sourcePlaylistId: 'PL1',
  syncStatus: PlaylistSyncStatus.Idle,
  lastSyncedAt: null,
  trackCount: 0,
  skipNonMusic: true,
  sort: PlaylistSort.Playlist,
  access: 'owner',
  hasShares: true,
  pinned: false,
  counts: {
    stored: 0,
    pending: 0,
    downloading: 0,
    failed: 0,
    unavailable: 0
  },
  remoteRemoved: 0,
  createdAt: '2026-11-06T00:00:00.000Z',
  updatedAt: '2026-11-06T00:00:00.000Z'
};

function page(offset: number, items: PlaylistWithCounts[]): PlaylistPage {
  return { items, total: items.length + offset, limit: 50, offset };
}

describe('pinPlaylistInPages', () => {
  it('patches the flag on every loaded page', () => {
    const data: InfiniteData<PlaylistPage> = {
      pages: [page(0, [ITEM]), page(1, [ITEM])],
      pageParams: [0, 1]
    };

    const next = pinPlaylistInPages(data, 'p1', true);

    expect(next.pages.map(entry => entry.items[0]?.pinned)).toEqual([
      true,
      true
    ]);
  });
});

describe('insertPlaylistInPages', () => {
  it('leads the first page and raises its total', () => {
    const data: InfiniteData<PlaylistPage> = {
      pages: [page(0, [{ ...ITEM, id: 'p2' }])],
      pageParams: [0]
    };

    const next = insertPlaylistInPages(data, ITEM);

    expect(next.pages[0]?.items.map(item => item.id)).toEqual(['p1', 'p2']);
    expect(next.pages[0]?.total).toBe(2);
  });

  it('marks a known playlist syncing in place instead of adding it', () => {
    const data: InfiniteData<PlaylistPage> = {
      pages: [page(0, [ITEM])],
      pageParams: [0]
    };

    const next = insertPlaylistInPages(data, {
      ...ITEM,
      syncStatus: PlaylistSyncStatus.Syncing
    });

    expect(next.pages[0]?.items).toHaveLength(1);
    expect(next.pages[0]?.items[0]?.syncStatus).toBe(
      PlaylistSyncStatus.Syncing
    );
    expect(next.pages[0]?.total).toBe(1);
  });
});
