import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDuration } from '@playliberty/ui-foundation';

import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';
import type { PlayerTrack } from '../../../shared/player/types';

import PlaylistDetailPage from './PlaylistDetailPage';

/*
 * A render-count measurement for the hot list. `formatDuration` is called once
 * per rendered track row with that row's own duration, and the three fixture
 * tracks have distinct durations, so counting calls per argument is a per-row
 * render count. The spy delegates to the real formatter, so the output the rows
 * draw is unchanged.
 *
 * Before the memoization this file asserts against, a queue change re-renders
 * every row: the page passes a fresh `onPlay` and fresh inline lane callbacks on
 * each render, and the row is not memoized, so nothing can be skipped.
 */
vi.mock('@playliberty/ui-foundation', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@playliberty/ui-foundation')>();
  return { ...actual, formatDuration: vi.fn(actual.formatDuration) };
});

const PLAYLIST_ID = 'playlist-1';
const DURATIONS = { 'track-1': 337, 'track-2': 273, 'track-3': 565 } as const;

function renderDetail() {
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/playlists/$playlistId',
    component: PlaylistDetailPage
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([detailRoute]),
    history: createMemoryHistory({
      initialEntries: [`/playlists/${PLAYLIST_ID}`]
    })
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

/** How many rows rendered, by the duration each row was drawn with. */
function renderedRows(): Map<number, number> {
  const counts = new Map<number, number>();

  for (const call of vi.mocked(formatDuration).mock.calls) {
    const seconds = call[0] as number;
    counts.set(seconds, (counts.get(seconds) ?? 0) + 1);
  }

  return counts;
}

function playerTrack(id: keyof typeof DURATIONS): PlayerTrack {
  return {
    id,
    title: id,
    playlistId: PLAYLIST_ID,
    playlistName: 'Rain On The Window',
    durationSeconds: DURATIONS[id],
    thumbnailPath: null
  };
}

function openQueue(): void {
  act(() => {
    usePlayerStore
      .getState()
      .startQueue(
        PLAYLIST_ID,
        [
          playerTrack('track-1'),
          playerTrack('track-2'),
          playerTrack('track-3')
        ],
        'track-2'
      );
  });
}

beforeEach(() => {
  usePlayerStore.getState().clear();
});

describe('PlaylistDetailPage row rendering', () => {
  it('re-renders only the row a queue change affects', async () => {
    renderDetail();

    await screen.findByRole('button', { name: 'Play Naima' });

    vi.mocked(formatDuration).mockClear();
    openQueue();

    const counts = renderedRows();

    expect(counts.get(DURATIONS['track-2'])).toBe(1);
    expect(counts.has(DURATIONS['track-1'])).toBe(false);
    expect(counts.has(DURATIONS['track-3'])).toBe(false);
  });

  it('re-renders only the current row on a play/pause change', async () => {
    renderDetail();

    await screen.findByRole('button', { name: 'Play Naima' });

    openQueue();
    vi.mocked(formatDuration).mockClear();

    act(() => {
      usePlayerStore.getState().setPlaying(false);
    });

    const counts = renderedRows();

    expect(counts.get(DURATIONS['track-2'])).toBe(1);
    expect(counts.has(DURATIONS['track-1'])).toBe(false);
    expect(counts.has(DURATIONS['track-3'])).toBe(false);
  });
});
