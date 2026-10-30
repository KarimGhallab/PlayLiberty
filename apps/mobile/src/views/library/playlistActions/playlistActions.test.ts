import { describe, expect, it } from '@jest/globals';
import type { InfiniteData } from '@tanstack/react-query';

import {
  type PlaylistPage,
  PlaylistSort,
  PlaylistSyncStatus,
  type PlaylistWithCounts,
  Provider,
  ShareLevel
} from '@playliberty/contracts';
import { Language, catalogs, createTranslator } from '@playliberty/i18n';

import { pinPlaylistInPages } from '../../../api/playlistCache';
import { deleteIntentFor, playlistActionsFor } from './playlistActions';

const base: PlaylistWithCounts = {
  id: 'playlist-1',
  ownerAccountId: 'account-1',
  name: 'Rain On The Window',
  coverTrackId: null,
  coverUpdatedAt: null,
  provider: Provider.Youtube,
  sourcePlaylistId: 'PL-demo',
  syncStatus: PlaylistSyncStatus.Idle,
  lastSyncedAt: '2026-09-29T12:00:00.000Z',
  trackCount: 12,
  skipNonMusic: true,
  sort: PlaylistSort.Playlist,
  access: 'owner',
  hasShares: false,
  pinned: false,
  counts: {
    stored: 9,
    pending: 1,
    downloading: 0,
    failed: 2,
    unavailable: 0
  },
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z'
};

function playlist(
  overrides: Partial<PlaylistWithCounts> = {}
): PlaylistWithCounts {
  return { ...base, ...overrides };
}

const t = createTranslator(catalogs[Language.English], Language.English);

describe('the playlist actions model', () => {
  it('offers the owner six actions, pin first and delete last', () => {
    expect(playlistActionsFor(playlist()).map(item => item.key)).toEqual([
      'pin',
      'share',
      'rename',
      'cover',
      'sync',
      'delete'
    ]);
  });

  it('offers a write collaborator the pin, Cover and Sync', () => {
    expect(
      playlistActionsFor(playlist({ access: ShareLevel.Write })).map(
        item => item.key
      )
    ).toEqual(['pin', 'cover', 'sync']);
  });

  it('offers a reader the pin alone', () => {
    expect(
      playlistActionsFor(playlist({ access: ShareLevel.Read })).map(
        item => item.key
      )
    ).toEqual(['pin']);
  });

  it('reads Pin on an unpinned playlist and Unpin on a pinned one', () => {
    const pinOf = (pinned: boolean) =>
      playlistActionsFor(playlist({ pinned })).find(item => item.key === 'pin')
        ?.label;

    expect(pinOf(false)).toBe('header.pin');
    expect(pinOf(true)).toBe('header.unpin');
  });

  it('flips the pin on the loaded pages so the gallery regroups', () => {
    const pages: InfiniteData<PlaylistPage> = {
      pages: [
        {
          items: [playlist()],
          total: 2,
          limit: 200,
          offset: 0
        },
        {
          items: [playlist({ id: 'playlist-2', pinned: true })],
          total: 2,
          limit: 200,
          offset: 1
        }
      ],
      pageParams: [0, 1]
    };

    const patched = pinPlaylistInPages(pages, 'playlist-2', false);

    expect(
      patched.pages.map(data => data.items.map(item => [item.id, item.pinned]))
    ).toEqual([[['playlist-1', false]], [['playlist-2', false]]]);
    expect(pages.pages[1]?.items[0]?.pinned).toBe(true);
  });

  it('defers a delete with the surface sentence and the playlist name', () => {
    expect(deleteIntentFor(t, playlist())).toEqual({
      id: 'playlist-1',
      message: 'Deleting playlist',
      detail: 'Rain On The Window'
    });
  });
});
