import { describe, expect, it } from 'vitest';

import type { PlaylistWithCounts } from '@playliberty/contracts';
import {
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  ShareLevel
} from '@playliberty/contracts';
import { Language, catalogs, createTranslator } from '@playliberty/i18n';

import { deleteIntentFor, playlistActionsFor } from './playlistActions.js';

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
  remoteRemoved: 0,
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

  it('leaves the pin off a surface that does not offer it', () => {
    const keys = (access: 'owner' | ShareLevel) =>
      playlistActionsFor(playlist({ access }), {
        includePin: false
      }).map(item => item.key);

    expect(keys('owner')).toEqual([
      'share',
      'rename',
      'cover',
      'sync',
      'delete'
    ]);
    expect(keys(ShareLevel.Write)).toEqual(['cover', 'sync']);
    expect(keys(ShareLevel.Read)).toEqual([]);
  });

  it('reads Pin on an unpinned playlist and Unpin on a pinned one', () => {
    const pinOf = (pinned: boolean) =>
      playlistActionsFor(playlist({ pinned })).find(item => item.key === 'pin')
        ?.label;

    expect(pinOf(false)).toBe('header.pin');
    expect(pinOf(true)).toBe('header.unpin');
  });

  it('defers a delete with the surface sentence and the playlist name', () => {
    expect(deleteIntentFor(t, playlist())).toEqual({
      id: 'playlist-1',
      message: 'Deleting playlist',
      detail: 'Rain On The Window'
    });
  });
});
