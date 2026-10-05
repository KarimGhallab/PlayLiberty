import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
 * The playlist read the skip-setting tests answer with, so a handler can echo the
 * value it was sent without repeating the whole shape.
 */
function playlistJson(skipNonMusic: boolean) {
  return {
    id: 'playlist-1',
    ownerAccountId: 'account-1',
    name: 'Rain On The Window',
    coverUrl: null,
    provider: 'youtube',
    sourcePlaylistId: 'PL-demo',
    syncStatus: 'idle',
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 3,
    skipNonMusic,
    access: 'owner',
    hasShares: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z'
  };
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

  it('draws the list in the queue order while the queue is this playlist, shuffled', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Shuffle Rain On The Window' })
    );

    /* The queue holds the two stored tracks; a fresh shuffled queue starts on the
     * first stored track, so `Naima` leads and `Blue In Green` follows, while the
     * pending row joins the group before it. */
    await waitFor(() =>
      expect(usePlayerStore.getState().queue[0].id).toBe('track-1')
    );

    const titles = screen
      .getAllByRole('button', { name: /^(Play|Pause) / })
      .map(
        button =>
          button.getAttribute('aria-label')?.replace(/^(Play|Pause)\s+/, '') ??
          ''
      )
      .filter(title => title !== 'this playlist');
    expect(titles).toEqual(['Blue In Green', 'Naima']);
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

  it('moves the playhead inside a shuffled queue rather than rebuilding it', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Shuffle Rain On The Window' })
    );
    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );

    const shuffledQueue = usePlayerStore
      .getState()
      .queue.map(track => track.id);

    fireEvent.click(await screen.findByRole('button', { name: 'Play Naima' }));

    const state = usePlayerStore.getState();

    /* The queue the listener can see is the queue that plays: the press moves the
     * cursor and leaves the order, the mode and the position of every entry. */
    expect(state.queue.map(track => track.id)).toEqual(shuffledQueue);
    expect(state.shuffle).toBe(true);
    expect(state.currentId).toBe('track-2');
    expect(state.isPlaying).toBe(true);
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

  it('shows the skip setting as a switch, on and enabled for the owner', async () => {
    renderDetail();

    const control = await screen.findByRole('switch', {
      name: 'Skip non-music parts'
    });

    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(control).toBeEnabled();
  });

  it('flips the switch optimistically and locks it until the server answers', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const bodies: unknown[] = [];
    server.use(
      http.patch(
        'http://localhost:3000/api/v1/playlists/playlist-1/skip-non-music',
        async ({ request }) => {
          bodies.push(await request.json());
          await gate;
          return HttpResponse.json(playlistJson(false));
        }
      )
    );
    renderDetail();

    const control = await screen.findByRole('switch', {
      name: 'Skip non-music parts'
    });
    fireEvent.click(control);

    /* The switch moves before the answer, and is locked while it waits. */
    await waitFor(() => {
      expect(control).toHaveAttribute('aria-checked', 'false');
    });
    expect(control).toBeDisabled();
    expect(bodies).toEqual([{ skipNonMusic: false }]);

    release();
    await waitFor(() => {
      expect(control).toBeEnabled();
    });
  });

  it('puts the switch back and says why when the change is refused', async () => {
    server.use(
      http.patch(
        'http://localhost:3000/api/v1/playlists/playlist-1/skip-non-music',
        () =>
          HttpResponse.json(
            {
              type: 'about:blank',
              title: 'Forbidden',
              status: 403,
              code: 'forbidden',
              detail: 'You cannot change this playlist.'
            },
            { status: 403 }
          )
      )
    );
    renderDetail();

    const control = await screen.findByRole('switch', {
      name: 'Skip non-music parts'
    });
    fireEvent.click(control);

    expect(
      await screen.findByText('The skip setting was not changed.')
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(control).toHaveAttribute('aria-checked', 'true');
    });
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
          skipNonMusic: true,
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
    /* The add control is the same rule: absent, not disabled. */
    expect(
      screen.queryByRole('button', { name: 'Add a track' })
    ).not.toBeInTheDocument();
    /* The setting is still theirs to read, so the switch is drawn disabled. */
    expect(
      screen.getByRole('switch', { name: 'Skip non-music parts' })
    ).toBeDisabled();
  });

  it('draws the add control for the owner and opens the dialog', async () => {
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Add a track' }));

    expect(
      await screen.findByRole('dialog', { name: 'Add a track' })
    ).toBeInTheDocument();
    /* The current playlist arrives checked, so the common case is one press. */
    expect(
      screen.getByRole('checkbox', { name: 'Rain On The Window' })
    ).toBeChecked();
  });

  it('adds one video to the chosen playlists in one request', async () => {
    const posted: unknown[] = [];
    server.use(
      http.post('http://localhost:3000/api/v1/tracks', async ({ request }) => {
        posted.push(await request.json());

        return HttpResponse.json({
          results: [{ playlistId: 'playlist-1', outcome: 'added' }]
        });
      })
    );
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Add a track' }));
    fireEvent.change(await screen.findByLabelText('Video link'), {
      target: { value: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(posted).toEqual([
        {
          url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
          playlistIds: ['playlist-1']
        }
      ]);
    });
  });

  it('keeps the dialog open and names the playlists that refused', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists', () =>
        HttpResponse.json({
          items: [
            {
              id: 'playlist-1',
              ownerAccountId: 'account-1',
              name: 'Rain On The Window',
              coverUrl: null,
              provider: 'youtube',
              sourcePlaylistId: 'PL-demo',
              syncStatus: 'idle',
              lastSyncedAt: '2026-09-29T12:00:00.000Z',
              trackCount: 3,
              skipNonMusic: true,
              access: 'owner',
              hasShares: false,
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-29T12:00:00.000Z'
            },
            {
              id: 'playlist-9',
              ownerAccountId: 'account-1',
              name: 'Night Bus',
              coverUrl: null,
              provider: 'youtube',
              sourcePlaylistId: 'PL-two',
              syncStatus: 'idle',
              lastSyncedAt: '2026-09-29T12:00:00.000Z',
              trackCount: 1,
              skipNonMusic: true,
              access: 'owner',
              hasShares: false,
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-29T12:00:00.000Z'
            }
          ],
          total: 2,
          limit: 50,
          offset: 0
        })
      ),
      http.post('http://localhost:3000/api/v1/tracks', () =>
        HttpResponse.json({
          results: [
            { playlistId: 'playlist-1', outcome: 'added' },
            { playlistId: 'playlist-9', outcome: 'refused' }
          ]
        })
      )
    );
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Add a track' }));
    fireEvent.change(await screen.findByLabelText('Video link'), {
      target: { value: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    /* The dialog is still open and names the playlist that said no. */
    expect(
      await screen.findByText(/Added to the rest\. Not added to:/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Added to the rest\. Not added to:/).parentElement
    ).toHaveTextContent('Night Bus');
  });

  it('closes the dialog when every playlist took the video', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/tracks', () =>
        HttpResponse.json({
          results: [
            { playlistId: 'playlist-1', outcome: 'added' },
            { playlistId: 'playlist-2', outcome: 'already_present' }
          ]
        })
      )
    );
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Add a track' }));
    fireEvent.change(await screen.findByLabelText('Video link'), {
      target: { value: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    /* An all-success batch has nothing to read, so the dialog goes, after its
     * exit. */
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Add a track' })
      ).not.toBeInTheDocument();
    });
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
