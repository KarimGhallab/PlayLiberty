import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ShareLevel } from '@playliberty/contracts';

import {
  useAddTrack,
  useCreatePlaylist,
  useDeletePlaylist,
  useGrantShare,
  useRemoveTrack,
  useRenamePlaylist,
  useRetryTrack,
  useRevokeShare,
  useSyncPlaylist
} from './queries';

/*
 * The invalidation map spec 09 names, pinned one mutation at a time. A mutation
 * that invalidates nothing is a screen that shows the old answer, so each hook is
 * driven through a mocked network and the reads it asked again are asserted.
 * Prefix keys are the surface: `['playlist', id]` is the invalidation that
 * carries the playlist, its run, its tracks and its shares.
 */

const PLAYLIST = 'playlist-1';

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const remove = vi.spyOn(queryClient, 'removeQueries');

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { invalidate, remove, wrapper };
}

describe('the mutation invalidation map', () => {
  it('creating a playlist invalidates the library', async () => {
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useCreatePlaylist(), { wrapper });

    await act(async () => {
      result.current.mutate({
        url: 'https://www.youtube.com/playlist?list=PL1234567890abcdef',
        skipNonMusic: true
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
  });

  it('starting a sync invalidates the playlist and the library', async () => {
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useSyncPlaylist(PLAYLIST), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', PLAYLIST]
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
  });

  it('renaming a playlist invalidates the playlist and the library', async () => {
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useRenamePlaylist(PLAYLIST), {
      wrapper
    });

    await act(async () => {
      result.current.mutate('Morning Jazz');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', PLAYLIST]
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
  });

  it('deleting a playlist removes it from the cache and invalidates the library', async () => {
    const { invalidate, remove, wrapper } = setup();
    const { result } = renderHook(() => useDeletePlaylist(PLAYLIST), {
      wrapper
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(remove).toHaveBeenCalledWith({ queryKey: ['playlist', PLAYLIST] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
  });

  it('the batch add invalidates the library and every playlist read', async () => {
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useAddTrack(), { wrapper });

    await act(async () => {
      result.current.mutate({
        url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
        playlistIds: [PLAYLIST]
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlist'] });
  });

  it('removing a track invalidates the playlist and the library', async () => {
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useRemoveTrack(PLAYLIST), { wrapper });

    await act(async () => {
      result.current.mutate('track-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', PLAYLIST]
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
  });

  it('retrying a track invalidates the playlist and the library', async () => {
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useRetryTrack(PLAYLIST), { wrapper });

    await act(async () => {
      result.current.mutate('track-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', PLAYLIST]
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
  });

  it('granting a share invalidates the shares, the playlist and the library', async () => {
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useGrantShare(PLAYLIST), { wrapper });

    await act(async () => {
      result.current.mutate({ accountId: 'account-2', level: ShareLevel.Read });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', PLAYLIST, 'shares']
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', PLAYLIST]
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
  });

  it('revoking a share invalidates the shares, the playlist and the library', async () => {
    const { invalidate, wrapper } = setup();
    const { result } = renderHook(() => useRevokeShare(PLAYLIST), { wrapper });

    await act(async () => {
      result.current.mutate('account-2');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', PLAYLIST, 'shares']
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', PLAYLIST]
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
  });
});
