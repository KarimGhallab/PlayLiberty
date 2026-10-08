import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  PlaylistSyncStatus,
  Provider,
  ShareLevel
} from '@playliberty/contracts';
import type { Playlist } from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import type { PlaylistActionsOptions } from './playlistActions';
import { canWritePlaylist, usePlaylistActions } from './playlistActions';

/*
 * The rule under test is which of the four playlist actions an account may
 * perform, by its access. The module is a hook, so
 * the test drives it through `renderHook` and reads the menu it builds; the
 * dialogs and the mutations are its implementation, not the seam this test
 * crosses.
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
    access: 'owner',
    hasShares: false,
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
  const rendered = renderHook(
    () =>
      usePlaylistActions('playlist-1', playlistValue, {
        defer,
        deleteMessage: 'library.deleteDeferred',
        ...options
      }),
    { wrapper }
  );

  return { ...rendered, defer };
}

describe('usePlaylistActions', () => {
  it('offers the owner the four actions, in order', () => {
    const { result } = control(playlist());

    expect(result.current.menu.map(item => item.key)).toEqual([
      'share',
      'rename',
      'sync',
      'delete'
    ]);
    expect(result.current.canWrite).toBe(true);
  });

  it('offers a write collaborator Sync now alone', () => {
    const { result } = control(playlist({ access: ShareLevel.Write }));

    expect(result.current.menu.map(item => item.key)).toEqual(['sync']);
    expect(result.current.canWrite).toBe(true);
  });

  it('offers a read collaborator nothing and no overflow', () => {
    const { result } = control(playlist({ access: ShareLevel.Read }));

    expect(result.current.menu).toEqual([]);
    expect(result.current.canWrite).toBe(false);
  });

  it('offers nothing before the playlist loads', () => {
    const { result } = control(undefined);

    expect(result.current.menu).toEqual([]);
    expect(result.current.canWrite).toBe(false);
    expect(result.current.dialogs).toBeNull();
  });

  it('defers a delete with the surface sentence and the playlist name', () => {
    const { result, defer } = control(playlist());

    result.current.menu.find(item => item.key === 'delete')?.onSelect();

    expect(defer).toHaveBeenCalledTimes(1);
    expect(defer).toHaveBeenCalledWith({
      id: 'playlist-1',
      message: 'Deleting playlist',
      detail: 'Rain On The Window',
      commit: expect.any(Function)
    });
  });

  it('keeps the delete off a write collaborator’s menu', () => {
    const { result, defer } = control(playlist({ access: ShareLevel.Write }));

    expect(result.current.menu.some(item => item.key === 'delete')).toBe(false);
    expect(defer).not.toHaveBeenCalled();
  });
});

/*
 * The predicate the menu's gating and the detail's writable set both consume.
 * It is the one place `owner || write` is written, so it is tested on its own
 * rather than only through the hook.
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
