import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  useAddTrack,
  useCreatePlaylist,
  useDeletePlaylist,
  useFetchTrackWhole,
  useGrantShare,
  useRemovePlaylistCover,
  useRemoveTrack,
  useRenamePlaylist,
  useRetryTrack,
  useRevokeShare,
  useSetPlaylistCover,
  useSyncPlaylist,
  useUpdatePin,
  useUpdateSkipNonMusic
} from '@playliberty/api-client';
import { ShareLevel } from '@playliberty/contracts';
import { cacheEffects } from '@playliberty/query';

/*
 * Each mutation names one cache fact (reads pinned in `cacheEffects.test.ts`);
 * one naming nothing is a stale screen, so each is asserted.
 */

const PLAYLIST = 'playlist-1';

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  const facts = {
    libraryChanged: vi.spyOn(cacheEffects, 'libraryChanged'),
    playlistChanged: vi.spyOn(cacheEffects, 'playlistChanged'),
    trackChanged: vi.spyOn(cacheEffects, 'trackChanged'),
    everyPlaylistChanged: vi.spyOn(cacheEffects, 'everyPlaylistChanged'),
    playlistRemoved: vi.spyOn(cacheEffects, 'playlistRemoved')
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, facts, wrapper };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the mutation cache facts', () => {
  it('creating a playlist refreshes the library', async () => {
    const { queryClient, facts, wrapper } = setup();
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
    expect(facts.libraryChanged).toHaveBeenCalledWith(queryClient);
  });

  it('starting a sync refreshes the playlist', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useSyncPlaylist(), { wrapper });

    await act(async () => {
      result.current.mutate(PLAYLIST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.playlistChanged).toHaveBeenCalledWith(queryClient, PLAYLIST);
  });

  it('renaming a playlist refreshes the playlist', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useRenamePlaylist(), {
      wrapper
    });

    await act(async () => {
      result.current.mutate({ playlistId: PLAYLIST, name: 'Morning Jazz' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.playlistChanged).toHaveBeenCalledWith(queryClient, PLAYLIST);
  });

  it('setting a cover refreshes the playlist and the gallery', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useSetPlaylistCover(), { wrapper });

    await act(async () => {
      result.current.mutate({
        playlistId: PLAYLIST,
        file: new File([new Uint8Array([1])], 'cover.jpg', {
          type: 'image/jpeg'
        }),
        crop: null
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.playlistChanged).toHaveBeenCalledWith(queryClient, PLAYLIST);
  });

  it('removing a cover refreshes the playlist and the gallery', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useRemovePlaylistCover(), { wrapper });

    await act(async () => {
      result.current.mutate(PLAYLIST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.playlistChanged).toHaveBeenCalledWith(queryClient, PLAYLIST);
  });

  it('changing the setting refreshes the library', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useUpdateSkipNonMusic(PLAYLIST), {
      wrapper
    });

    await act(async () => {
      result.current.mutate(false);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.libraryChanged).toHaveBeenCalledWith(queryClient);
  });

  it('pinning a playlist refreshes the library', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useUpdatePin(), { wrapper });

    await act(async () => {
      result.current.mutate({ playlistId: PLAYLIST, pinned: true });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.libraryChanged).toHaveBeenCalledWith(queryClient);
  });

  it('deleting a playlist removes it through the removal fact', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useDeletePlaylist(), {
      wrapper
    });

    await act(async () => {
      result.current.mutate(PLAYLIST);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.playlistRemoved).toHaveBeenCalledWith(queryClient, PLAYLIST);
  });

  it('the batch add refreshes every playlist read', async () => {
    const { queryClient, facts, wrapper } = setup();
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
    expect(facts.everyPlaylistChanged).toHaveBeenCalledWith(queryClient);
  });

  it('removing a track refreshes the playlist', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useRemoveTrack(PLAYLIST), { wrapper });

    await act(async () => {
      result.current.mutate('track-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.trackChanged).toHaveBeenCalledWith(queryClient, [PLAYLIST]);
  });

  it('retrying a track refreshes the playlist', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useRetryTrack(PLAYLIST), { wrapper });

    await act(async () => {
      result.current.mutate('track-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.trackChanged).toHaveBeenCalledWith(queryClient, [PLAYLIST]);
  });

  it('fetching a track whole refreshes the playlist', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useFetchTrackWhole(PLAYLIST), {
      wrapper
    });

    await act(async () => {
      result.current.mutate('track-1');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.trackChanged).toHaveBeenCalledWith(queryClient, [PLAYLIST]);
  });

  it('granting a share refreshes the playlist', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useGrantShare(PLAYLIST), { wrapper });

    await act(async () => {
      result.current.mutate({ accountId: 'account-2', level: ShareLevel.Read });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.playlistChanged).toHaveBeenCalledWith(queryClient, PLAYLIST);
  });

  it('revoking a share refreshes the playlist', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useRevokeShare(PLAYLIST), { wrapper });

    await act(async () => {
      result.current.mutate('account-2');
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.playlistChanged).toHaveBeenCalledWith(queryClient, PLAYLIST);
  });
});
