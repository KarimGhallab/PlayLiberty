import { describe, expect, it } from '@jest/globals';
import type { InfiniteData } from '@tanstack/react-query';

import {
  type PlaylistPage,
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  type SyncRun,
  SyncRunStatus
} from '@playliberty/contracts';

import { insertPlaylistInPages } from '../playlistCache';
import { createPlaylistPlaceholder } from './useCreatePlaylist';

const run: SyncRun = {
  id: 'run-1',
  playlistId: 'playlist-new',
  status: SyncRunStatus.Running,
  addedCount: 0,
  retainedCount: 0,
  removedCount: 0,
  failedCount: 0,
  startedAt: '2026-10-30T12:00:00.000Z',
  finishedAt: null,
  error: null
};

const input = {
  url: 'https://www.youtube.com/playlist?list=PL-demo',
  skipNonMusic: false
};

function page(offset: number, total: number): PlaylistPage {
  return {
    items: [],
    total,
    limit: 200,
    offset
  };
}

describe('the created playlist placeholder', () => {
  it('draws the new playlist as syncing, named by its source id', () => {
    const placeholder = createPlaylistPlaceholder(run, input);

    expect(placeholder).toMatchObject({
      id: 'playlist-new',
      name: 'PL-demo',
      sourcePlaylistId: 'PL-demo',
      syncStatus: PlaylistSyncStatus.Syncing,
      skipNonMusic: false,
      access: 'owner',
      provider: Provider.Youtube,
      sort: PlaylistSort.Playlist,
      trackCount: 0,
      pinned: false
    });
  });

  it('leads the first page until the next read replaces it', () => {
    const data: InfiniteData<PlaylistPage> = {
      pages: [page(0, 1), page(1, 1)],
      pageParams: [0, 1]
    };

    const next = insertPlaylistInPages(
      data,
      createPlaylistPlaceholder(run, input)
    );

    expect(next.pages[0]?.items[0]?.id).toBe('playlist-new');
    expect(next.pages[0]?.total).toBe(2);
    expect(next.pages[1]).toBe(data.pages[1]);
    expect(data.pages[0]?.items).toEqual([]);
  });

  it('marks a source the page already holds as syncing', () => {
    const existing = {
      ...createPlaylistPlaceholder(run, input),
      id: 'playlist-old',
      name: 'Old name',
      syncStatus: PlaylistSyncStatus.Idle
    };
    const data: InfiniteData<PlaylistPage> = {
      pages: [{ ...page(0, 1), items: [existing] }],
      pageParams: [0]
    };

    const next = insertPlaylistInPages(data, {
      ...existing,
      syncStatus: PlaylistSyncStatus.Syncing
    });

    expect(next.pages[0]?.items[0]?.syncStatus).toBe(
      PlaylistSyncStatus.Syncing
    );
    expect(next.pages[0]?.total).toBe(1);
  });
});
