import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  ShareLevel
} from '@playliberty/contracts';
import type { Playlist } from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import type { PlaylistActionsOptions } from './playlistActions';
import { canWritePlaylist, usePlaylistActions } from './playlistActions';

/*
 * The rule under test is which actions an account may perform, by its access;
 * the dialogs and mutations are the hook's implementation, not this test's
 * seam.
 */

function playlist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'playlist-1',
    ownerAccountId: 'account-1',
    name: 'Rain On The Window',
    coverTrackId: null,
    provider: Provider.Youtube,
    sourcePlaylistId: 'PL-demo',
    syncStatus: PlaylistSyncStatus.Idle,
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 128,
    skipNonMusic: true,
    sort: PlaylistSort.Playlist,
    access: 'owner',
    hasShares: false,
    pinned: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z',
    ...overrides
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider preferred={['en']}>{children}</I18nProvider>
    </QueryClientProvider>
  );
}

function control(
  playlistValue: Playlist | undefined,
  options: Partial<PlaylistActionsOptions> = {}
) {
  const defer = vi.fn();
  const onPinRefused = vi.fn();
  const rendered = renderHook(
    () =>
      usePlaylistActions({
        defer,
        deleteMessage: 'library.deleteDeferred',
        pin: { onRefused: onPinRefused },
        ...options
      }),
    { wrapper }
  );

  return {
    ...rendered,
    menu: rendered.result.current.menuFor(playlistValue),
    defer
  };
}

describe('usePlaylistActions', () => {
  it('offers the owner the five actions, with the pin first and the delete last', () => {
    const { menu } = control(playlist());

    expect(menu.map(item => item.key)).toEqual([
      'pin',
      'share',
      'rename',
      'sync',
      'delete'
    ]);
  });

  it('offers a write collaborator the pin and Sync now', () => {
    const { menu } = control(playlist({ access: ShareLevel.Write }));

    expect(menu.map(item => item.key)).toEqual(['pin', 'sync']);
  });

  it('reads Pin on an unpinned playlist and Unpin on a pinned one', () => {
    const unpinned = control(playlist({ pinned: false }));
    const pinned = control(playlist({ pinned: true }));

    expect(unpinned.menu.find(item => item.key === 'pin')?.label).toBe(
      'header.pin'
    );
    expect(pinned.menu.find(item => item.key === 'pin')?.label).toBe(
      'header.unpin'
    );
  });

  it('leaves the pin off a surface that does not offer one', () => {
    const { menu } = control(playlist(), { pin: undefined });

    expect(menu.map(item => item.key)).toEqual([
      'share',
      'rename',
      'sync',
      'delete'
    ]);
  });

  it('offers a read collaborator the pin alone', () => {
    const { menu } = control(playlist({ access: ShareLevel.Read }));

    expect(menu.map(item => item.key)).toEqual(['pin']);
  });

  it('offers nothing before the playlist loads', () => {
    const { menu, result } = control(undefined);

    expect(menu).toEqual([]);
    expect(result.current.dialogs).toBeNull();
  });

  it('defers a delete with the surface sentence and the playlist name', () => {
    const { menu, defer } = control(playlist());

    menu.find(item => item.key === 'delete')?.onSelect();

    expect(defer).toHaveBeenCalledTimes(1);
    expect(defer).toHaveBeenCalledWith({
      id: 'playlist-1',
      message: 'Deleting playlist',
      detail: 'Rain On The Window',
      commit: expect.any(Function)
    });
  });
});

/*
 * The one place `owner || write` is written, consumed by the menu and the
 * detail, so it is tested on its own rather than only through the hook.
 */
describe('canWritePlaylist', () => {
  it('is true for the owner and a write collaborator', () => {
    expect(canWritePlaylist(playlist())).toBe(true);
    expect(canWritePlaylist(playlist({ access: ShareLevel.Write }))).toBe(true);
  });

  it('is false for a read collaborator and an unloaded playlist', () => {
    expect(canWritePlaylist(playlist({ access: ShareLevel.Read }))).toBe(false);
    expect(canWritePlaylist(undefined)).toBe(false);
  });
});
