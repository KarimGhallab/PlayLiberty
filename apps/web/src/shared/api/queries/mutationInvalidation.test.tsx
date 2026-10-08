import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShareLevel } from '@playliberty/contracts';

import { cacheEffects } from '../cacheEffects/cacheEffects';
import {
  useAddTrack,
  useCreatePlaylist,
  useDeletePlaylist,
  useFetchTrackWhole,
  useGrantShare,
  useRemoveTrack,
  useRenamePlaylist,
  useRetryTrack,
  useRevokeShare,
  useSyncPlaylist,
  useUpdateSkipNonMusic
} from './queries';

/*
 * Each mutation names one cache fact; the reads that fact asks again are pinned
 * in `cacheEffects.test.ts`. A mutation that names nothing is a screen that shows
 * the old answer, so each hook is driven through a mocked network and the fact it
 * named is asserted.
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
    const { result } = renderHook(() => useSyncPlaylist(PLAYLIST), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(facts.playlistChanged).toHaveBeenCalledWith(queryClient, PLAYLIST);
  });

  it('renaming a playlist refreshes the playlist', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useRenamePlaylist(PLAYLIST), {
      wrapper
    });

    await act(async () => {
      result.current.mutate('Morning Jazz');
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

  it('deleting a playlist removes it through the removal fact', async () => {
    const { queryClient, facts, wrapper } = setup();
    const { result } = renderHook(() => useDeletePlaylist(PLAYLIST), {
      wrapper
    });

    await act(async () => {
      result.current.mutate();
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
