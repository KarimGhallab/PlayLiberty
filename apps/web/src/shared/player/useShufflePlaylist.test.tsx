import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '../../testing/mocks/server';
import { usePlayerStore } from './playerStore';
import { refusalNotice, useShufflePlaylist } from './useShufflePlaylist';

const PLAYLIST = { id: 'playlist-1', name: 'Rain On The Window' } as const;

function track(id: string, fileStatus = 'stored') {
  return {
    track: {
      id,
      provider: 'youtube',
      videoId: `video-${id}`,
      title: id,
      durationSeconds: 200,
      skipNonMusic: true,
      thumbnailPath: null,
      fileStatus,
      sourceStatus: 'available',
      failureReason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z'
    },
    origin: 'remote',
    position: 0
  };
}

function tracksPage(items: unknown[]) {
  return HttpResponse.json({
    items,
    total: items.length,
    limit: 50,
    offset: 0
  });
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function control() {
  return renderHook(() => useShufflePlaylist(), { wrapper });
}

beforeEach(() => {
  usePlayerStore.getState().clear();
});

describe('useShufflePlaylist', () => {
  it('starts a shuffled queue when there is none', async () => {
    const { result } = control();

    act(() => result.current.shufflePlaylist(PLAYLIST));

    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(true);
    expect(state.isPlaying).toBe(true);
    expect(state.currentId).toBe('track-1');
    expect(state.queue.map(item => item.id)).toEqual(['track-1', 'track-2']);
  });

  it('replaces another playlist’s queue and starts this one shuffled', async () => {
    const { result } = control();

    usePlayerStore.getState().startQueue(
      'playlist-9',
      [
        {
          id: 'elsewhere',
          title: 'Elsewhere',
          playlistId: 'playlist-9',
          playlistName: 'Another',
          durationSeconds: 200,
          thumbnailPath: null
        }
      ],
      'elsewhere'
    );

    act(() => result.current.shufflePlaylist(PLAYLIST));

    await waitFor(() =>
      expect(usePlayerStore.getState().queue[0].playlistId).toBe('playlist-1')
    );

    expect(usePlayerStore.getState().shuffle).toBe(true);
    expect(usePlayerStore.getState().currentId).toBe('track-1');
  });

  it('turns the shuffle off and leaves the transport alone when this playlist is the queue', async () => {
    const { result } = control();

    usePlayerStore.getState().startQueue(
      'playlist-1',
      [
        {
          id: 'track-1',
          title: 'One',
          playlistId: 'playlist-1',
          playlistName: 'Rain On The Window',
          durationSeconds: 200,
          thumbnailPath: null
        },
        {
          id: 'track-2',
          title: 'Two',
          playlistId: 'playlist-1',
          playlistName: 'Rain On The Window',
          durationSeconds: 200,
          thumbnailPath: null
        }
      ],
      'track-1',
      true
    );
    usePlayerStore.getState().setPlaying(false);

    act(() => result.current.shufflePlaylist(PLAYLIST));

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(false);
    expect(state.isPlaying).toBe(false);
    expect(state.queue.map(item => item.id)).toEqual(['track-1', 'track-2']);
  });

  it('resumes a paused queue when the shuffle is turned on', () => {
    const { result } = control();

    usePlayerStore.getState().startQueue(
      'playlist-1',
      [
        {
          id: 'track-1',
          title: 'One',
          playlistId: 'playlist-1',
          playlistName: 'Rain On The Window',
          durationSeconds: 200,
          thumbnailPath: null
        }
      ],
      'track-1'
    );
    usePlayerStore.getState().setPlaying(false);

    act(() => result.current.shufflePlaylist(PLAYLIST));

    expect(usePlayerStore.getState().shuffle).toBe(true);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('refuses a playlist with no stored track and says so', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists/playlist-1/tracks', () =>
        tracksPage([track('track-1', 'pending')])
      )
    );

    const { result } = control();

    act(() => result.current.shufflePlaylist(PLAYLIST));

    await waitFor(() =>
      expect(result.current.refusal).toEqual({
        name: 'Rain On The Window',
        reason: 'empty'
      })
    );
    expect(usePlayerStore.getState().queue).toHaveLength(0);
  });

  it('refuses a read that failed and says so', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists/playlist-1/tracks', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Service unavailable',
            status: 503,
            detail: 'The tracks are unavailable.',
            code: 'service_unavailable'
          },
          { status: 503 }
        )
      )
    );

    const { result } = control();

    act(() => result.current.shufflePlaylist(PLAYLIST));

    await waitFor(() =>
      expect(result.current.refusal).toEqual({
        name: 'Rain On The Window',
        reason: 'unreachable'
      })
    );
    expect(usePlayerStore.getState().queue).toHaveLength(0);
  });
});

describe('refusalNotice', () => {
  it('words an empty refusal as one sentence and one line', () => {
    expect(refusalNotice({ name: 'Shared Mix', reason: 'empty' })).toEqual({
      message: 'Nothing to play in “Shared Mix”.',
      detail: 'No track in it has finished downloading.'
    });
  });

  it('words an unreachable refusal as one sentence and one line', () => {
    expect(
      refusalNotice({ name: 'Shared Mix', reason: 'unreachable' })
    ).toEqual({
      message: '“Shared Mix” could not be read.',
      detail: 'Its tracks could not be loaded.'
    });
  });
});
