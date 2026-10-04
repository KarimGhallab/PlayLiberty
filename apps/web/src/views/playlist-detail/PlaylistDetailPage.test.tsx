import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { usePlayerStore } from '../../shared/player/playerStore';
import { MOBILE_QUERY } from '../../shared/useMediaQuery';

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

/*
 * The media-query stub answers one query and delegates every other to the
 * global default, so a test can move the viewport without disturbing the
 * `prefers-reduced-motion` checks. The returned function puts the original back,
 * because a stub left in place would follow every later test.
 */
function stubViewport(matchingQuery: string): () => void {
  const original = window.matchMedia;

  window.matchMedia = (query: string) =>
    ({
      matches: query === matchingQuery,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    }) as MediaQueryList;

  return () => {
    window.matchMedia = original;
  };
}

beforeEach(() => {
  usePlayerStore.getState().clear();
});

describe('PlaylistDetailPage', () => {
  it('offers a labelled way home', async () => {
    renderDetail();

    expect(
      await screen.findByRole('link', { name: 'Back to home' })
    ).toHaveAttribute('href', '/');
  });

  /*
   * The header's two arrangements are different markup, so the viewport decides
   * between them: the web draws the card, whose cover sits above the identity,
   * and a phone draws the row, whose cover sits beside it. The assertion is the
   * attribute the component renders, because that is what picks the markup the
   * rest of the header hangs off.
   */
  it('draws the header as the card at the web width', async () => {
    const { container } = renderDetail();

    await screen.findByRole('button', { name: 'Play this playlist' });

    expect(
      container.querySelector('[data-arrangement="card"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-arrangement="row"]')
    ).not.toBeInTheDocument();
  });

  it('draws the header as the row at the phone width', async () => {
    const restore = stubViewport(MOBILE_QUERY);

    try {
      const { container } = renderDetail();

      await screen.findByRole('button', { name: 'Play this playlist' });

      expect(
        container.querySelector('[data-arrangement="row"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-arrangement="card"]')
      ).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

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

  it('disables the header next when the playing track is the last', async () => {
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Play Naima' }));

    expect(
      await screen.findByRole('button', { name: 'Track next' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skip back' })).toBeEnabled();
  });

  it('toggles playback when the current row is pressed again', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Play Blue In Green' })
    );
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    fireEvent.click(
      screen.getByRole('button', { name: 'Pause Blue In Green' })
    );
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('keeps the header steps while paused on this playlist', async () => {
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Play Naima' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Pause this playlist' })
    );

    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(
      screen.getByRole('button', { name: 'Skip back' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Track next' })
    ).toBeInTheDocument();
  });

  it('offers the row menu to a writer, who may remove a track', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Actions for Blue In Green' })
    );

    expect(
      screen.getByRole('menuitem', { name: 'Remove from playlist' })
    ).toBeInTheDocument();
  });

  it('defers a track removal behind a cancellable toast', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Actions for Blue In Green' })
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Remove from playlist' })
    );

    /* The press opens the window; the call waits for its deadline, and the
     * toast speaks in the present because nothing has been removed yet. */
    expect(await screen.findByText('Removing track')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('cancels a deferred removal', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Actions for Blue In Green' })
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Remove from playlist' })
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Removing track')).not.toBeInTheDocument();
  });

  it('shows Share and Rename to the owner and opens each dialog', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );

    expect(screen.getByRole('menuitem', { name: 'Share' })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Rename' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    expect(
      await screen.findByRole('dialog', { name: 'Rename playlist' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('names the playlist from the playlist read', async () => {
    renderDetail();

    expect(
      await screen.findByRole('heading', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
  });

  it('opens the share dialog with the accounts to share with', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Share' }));

    expect(
      await screen.findByRole('dialog', { name: 'Share playlist' })
    ).toBeInTheDocument();
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Can listen' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Can edit' })
    ).toBeInTheDocument();
  });

  it('names the playlist from the playlist read', async () => {
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

  it('shows the not-found state and no header when the playlist 404s', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists/playlist-1', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Not found',
            status: 404,
            detail: 'No playlist with that id.',
            code: 'not_found'
          },
          { status: 404 }
        )
      )
    );
    renderDetail();

    expect(
      await screen.findByRole('heading', { name: 'This playlist is not here' })
    ).toBeInTheDocument();
    /* Neither cause is claimed, and the header for a playlist that is not there
     * is not drawn. */
    expect(screen.queryByText('Rain On The Window')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Nothing here yet' })
    ).not.toBeInTheDocument();
  });

  it('draws the summary of the latest run under the header card', async () => {
    renderDetail();

    expect(await screen.findByText('kept')).toBeInTheDocument();
    expect(screen.getByText('128')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('gates the owner overflow on the playlist access', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );

    expect(
      screen.getByRole('menuitem', { name: 'Sync now' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Delete playlist' })
    ).toBeInTheDocument();
  });

  it('draws no overflow at all for a read collaborator', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists/playlist-1', () =>
        HttpResponse.json({
          id: 'playlist-1',
          ownerAccountId: 'account-1',
          name: 'Rain On The Window',
          coverUrl: null,
          provider: 'youtube',
          sourcePlaylistId: 'PL-demo',
          syncStatus: 'idle',
          lastSyncedAt: '2026-09-29T12:00:00.000Z',
          trackCount: 3,
          access: 'read',
          hasShares: false,
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-29T12:00:00.000Z'
        })
      )
    );
    renderDetail();

    await screen.findByRole('heading', { name: 'Rain On The Window' });

    expect(
      screen.queryByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    ).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderDetail();

    await screen.findByRole('heading', { name: 'Rain On The Window' });

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
