import { describe, expect, it } from '@jest/globals';
import type { InfiniteData } from '@tanstack/react-query';

import {
  type PlaylistPage,
  PlaylistSort,
  PlaylistSyncStatus,
  type PlaylistWithCounts,
  Provider
} from '@playliberty/contracts';

import { flattenPlaylistPages, nextPageOffset } from './usePlaylists';

function item(id: string): PlaylistWithCounts {
  return {
    id,
    ownerAccountId: 'account-1',
    name: id,
    coverTrackId: null,
    coverUpdatedAt: null,
    provider: Provider.Youtube,
    sourcePlaylistId: `PL-${id}`,
    syncStatus: PlaylistSyncStatus.Idle,
    lastSyncedAt: null,
    trackCount: 0,
    skipNonMusic: true,
    sort: PlaylistSort.Playlist,
    access: 'owner',
    hasShares: false,
    pinned: false,
    counts: {
      stored: 0,
      pending: 0,
      downloading: 0,
      failed: 0,
      unavailable: 0
    },
    remoteRemoved: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  };
}

function page(offset: number, itemCount: number, total: number): PlaylistPage {
  return {
    items: Array.from({ length: itemCount }, (_, index) =>
      item(`playlist-${offset + index}`)
    ),
    total,
    limit: 200,
    offset
  };
}

describe('the gallery paging', () => {
  it('asks for the offset after a full first page', () => {
    expect(nextPageOffset(page(0, 200, 250))).toBe(200);
  });

  it('stops when the loaded page reaches the total', () => {
    expect(nextPageOffset(page(200, 50, 250))).toBeUndefined();
  });

  it('stops on an empty page instead of asking the same offset again', () => {
    expect(nextPageOffset(page(200, 0, 250))).toBeUndefined();
  });

  it('flattens the loaded pages and keeps the first total', () => {
    const data: InfiniteData<PlaylistPage> = {
      pages: [page(0, 2, 4), page(2, 2, 4)],
      pageParams: [0, 2]
    };

    const flat = flattenPlaylistPages(data);

    expect(flat.items.map(entry => entry.id)).toEqual([
      'playlist-0',
      'playlist-1',
      'playlist-2',
      'playlist-3'
    ]);
    expect(flat.total).toBe(4);
  });
});
