import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { usePlayerStore } from '../../shared/player/playerStore';

import { server } from '../../testing/mocks/server';
import PlaylistDetailPage from './PlaylistDetailPage';

const PLAYLIST_ID = 'playlist-1';

function renderDetail(playlistId = PLAYLIST_ID) {
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/playlists/$playlistId',
    component: PlaylistDetailPage
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([detailRoute]),
    history: createMemoryHistory({
      initialEntries: [`/playlists/${playlistId}`]
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

beforeEach(() => {
  usePlayerStore.getState().clear();
});

describe('PlaylistDetailPage', () => {
  it('lists the playlist tracks that are playable', async () => {
    renderDetail();

    expect(
      await screen.findByRole('button', { name: 'Play Blue In Green' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Play Naima' })
    ).toBeInTheDocument();
  });

  it('offers no play control for a track whose file is not stored', async () => {
    renderDetail();

    /*
     * `Flamenco Sketches` is pending in the fixtures, so it is listed and
     * unplayable. The control is absent rather than disabled: a button that
     * cannot be pressed would claim a track can be heard when it cannot.
     */
    expect(await screen.findByText('Flamenco Sketches')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Play Flamenco Sketches' })
    ).not.toBeInTheDocument();
  });

  it('builds the queue from the pressed track and starts there', async () => {
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Play Naima' }));

    const state = usePlayerStore.getState();

    expect(state.queue.map(track => track.title)).toEqual([
      'Blue In Green',
      'Naima'
    ]);
    expect(state.queue.every(track => track.playlistId === PLAYLIST_ID)).toBe(
      true
    );
    expect(
      state.queue.every(track => track.playlistName === 'Rain On The Window')
    ).toBe(true);
    expect(state.currentId).toBe('track-2');
    expect(state.isPlaying).toBe(true);
    expect(state.positionSeconds).toBe(0);
  });

  it('names the playlist in the heading from the playlist read', async () => {
    renderDetail();

    expect(
      await screen.findByRole('heading', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
  });

  it('shows a read failure rather than an empty list', async () => {
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
    renderDetail();

    expect(
      await screen.findByText('Tracks could not be loaded.')
    ).toBeInTheDocument();
    expect(screen.queryByText('No tracks yet.')).not.toBeInTheDocument();
  });
});
