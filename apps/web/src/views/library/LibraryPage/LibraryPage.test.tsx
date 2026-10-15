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
import { afterEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';
import { MOBILE_QUERY } from '../../../shared/useMediaQuery/useMediaQuery';

import { EMPTY_COUNTS } from '../../../testing/mocks/handlers';
import { server } from '../../../testing/mocks/server';
import { stubViewport } from '../../../testing/viewport';
import LibraryPage from './LibraryPage';

function emptyPage() {
  server.use(
    http.get('http://localhost:3000/api/v1/playlists', () =>
      HttpResponse.json({ items: [], total: 0, limit: 50, offset: 0 })
    )
  );
}

function failedPage() {
  server.use(
    http.get('http://localhost:3000/api/v1/playlists', () =>
      HttpResponse.json(
        {
          type: 'about:blank',
          title: 'Service unavailable',
          status: 503,
          detail: 'The library is unavailable.',
          code: 'service_unavailable'
        },
        { status: 503 }
      )
    )
  );
}

const syncRun = {
  id: 'run-1',
  playlistId: 'playlist-3',
  status: 'running',
  addedCount: 0,
  retainedCount: 0,
  removedCount: 0,
  failedCount: 0,
  startedAt: '2026-10-03T12:00:00.000Z',
  finishedAt: null,
  error: null
};

const newPlaylist = {
  id: 'playlist-3',
  ownerAccountId: 'account-1',
  name: 'New Mix',
  coverTrackId: null,
  provider: 'youtube',
  sourcePlaylistId: 'PL-new',
  syncStatus: 'syncing',
  lastSyncedAt: null,
  trackCount: 0,
  skipNonMusic: true,
  sort: 'playlist',
  access: 'owner',
  hasShares: false,
  counts: { ...EMPTY_COUNTS, stored: 0 },
  createdAt: '2026-10-03T12:00:00.000Z',
  updatedAt: '2026-10-03T12:00:00.000Z'
};

/*
 * An owned playlist. Two of these stand in a list when a test needs two
 * deletable items to press Delete on inside one undo window.
 */
function ownedItem(id: string, name: string) {
  return {
    id,
    ownerAccountId: 'account-1',
    name,
    coverTrackId: null,
    provider: 'youtube',
    sourcePlaylistId: `PL-${id}`,
    syncStatus: 'idle',
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 1,
    skipNonMusic: true,
    sort: 'playlist',
    access: 'owner',
    hasShares: false,
    counts: { ...EMPTY_COUNTS, stored: 1 },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z'
  };
}

/*
 * The list the base handlers return, repeated here so the create flow has a list
 * to leave before it has one to gain.
 */
const baseItems = [
  {
    id: 'playlist-1',
    ownerAccountId: 'account-1',
    name: 'Rain On The Window',
    coverTrackId: null,
    provider: 'youtube',
    sourcePlaylistId: 'PL-demo',
    syncStatus: 'idle',
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 1,
    skipNonMusic: true,
    sort: 'playlist',
    access: 'owner',
    hasShares: false,
    counts: { ...EMPTY_COUNTS, stored: 1 },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z'
  }
];

/*
 * A create that answers `202` with the run, and a list read that carries the new
 * playlist only once the create has happened. That pair is the route's own shape:
 * the item is not in the response, it arrives from the server on the next read,
 * and the read before the create does not see it.
 */
function createSucceeds(): { requests: Request[] } {
  const requests: Request[] = [];
  let created = false;
  server.use(
    http.post('http://localhost:3000/api/v1/playlists', async ({ request }) => {
      requests.push(request);
      created = true;
      return HttpResponse.json(syncRun, { status: 202 });
    }),
    http.get('http://localhost:3000/api/v1/playlists', () => {
      const items = created ? [newPlaylist] : baseItems;
      return HttpResponse.json({
        items,
        total: items.length,
        limit: 50,
        offset: 0
      });
    })
  );

  return { requests };
}

/*
 * The dialog fades out over 180ms and unmounts itself when that elapses. These
 * tests run on real timers, so the exit is awaited rather than advanced.
 */
/*
 * A directory that carries one account and not the shared item's owner, so the
 * item must fall back to its indicator alone. `account-2` is the shared item's
 * owner in the base fixture, so a directory of `account-9` is a real miss.
 */
function directoryOf(ownerId: string): void {
  server.use(
    http.get('http://localhost:3000/api/v1/accounts', () =>
      HttpResponse.json({
        items: [{ id: ownerId, displayName: 'Ada', avatarUrl: null }],
        total: 1,
        limit: 50,
        offset: 0
      })
    )
  );
}

async function waitForDialogExit(): Promise<void> {
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  );
}

function createRefused(): { requests: Request[] } {
  const requests: Request[] = [];
  server.use(
    http.post('http://localhost:3000/api/v1/playlists', async ({ request }) => {
      requests.push(request);
      return HttpResponse.json(
        {
          type: 'about:blank',
          title: 'Invalid Request',
          status: 400,
          detail:
            'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...',
          code: 'invalid_request'
        },
        { status: 400 }
      );
    })
  );

  return { requests };
}

/*
 * The library is rendered inside a real router because every item carries links
 * to the playlist. The detail route is a stub, since nothing here asserts what it
 * draws.
 */
function renderLibraryPage() {
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/playlists/$playlistId',
    component: () => <p>detail</p>
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: LibraryPage
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, detailRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] })
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider preferred={['en']}>
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>
  );
}

describe('LibraryPage', () => {
  afterEach(() => {
    window.localStorage.clear();
    usePlayerStore.getState().clear();
  });

  it('renders a playlist from the API and has no axe violations', async () => {
    const { container } = renderLibraryPage();

    expect(await screen.findByText('Rain On The Window')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('track')).toBeInTheDocument();

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });

  /*
   * The shuffle is a property of the queue, so a row reports pressed only while
   * the queue is that playlist and shuffle is on. Shuffling one item must leave
   * every other row unpressed, which is what tells a reader which playlist the
   * shuffle belongs to.
   */
  it('presses only the playlist the queue belongs to', async () => {
    renderLibraryPage();

    const own = await screen.findByRole('button', {
      name: 'Shuffle Rain On The Window'
    });
    const other = screen.getByRole('button', { name: 'Shuffle Shared Mix' });

    fireEvent.click(own);
    await waitFor(() => expect(usePlayerStore.getState().shuffle).toBe(true));

    expect(own).toHaveAttribute('aria-pressed', 'true');
    expect(other).toHaveAttribute('aria-pressed', 'false');

    /* A second press on this playlist's own queue turns the shuffle off. */
    fireEvent.click(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    );
    await waitFor(() => expect(usePlayerStore.getState().shuffle).toBe(false));

    expect(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: 'Shuffle Shared Mix' })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders an owned playlist and a shared one as the same item in one list', async () => {
    renderLibraryPage();

    const items = await screen.findAllByRole('listitem');

    expect(items).toHaveLength(2);
    expect(screen.getByText('Rain On The Window')).toBeInTheDocument();
    expect(screen.getByText('Shared Mix')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'You are a collaborator' })
    ).toBeInTheDocument();
  });

  /*
   * The mark is drawn from the counts the list read carries, which is why the
   * gallery costs one read: a playlist whose tracks are all stored wears nothing,
   * and one with tracks missing wears a single pill naming how many.
   */
  it('marks the playlists the list read reports as incomplete, one pill each', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists', () =>
        HttpResponse.json({
          items: [
            {
              ...ownedItem('playlist-1', 'Rain On The Window'),
              counts: { ...EMPTY_COUNTS, stored: 3, failed: 2 }
            },
            {
              ...ownedItem('playlist-2', 'Night Bus'),
              trackCount: 0,
              counts: EMPTY_COUNTS
            },
            {
              ...ownedItem('playlist-3', 'High Water'),
              counts: { ...EMPTY_COUNTS, stored: 1, pending: 4 }
            }
          ],
          total: 3,
          limit: 50,
          offset: 0
        })
      )
    );
    renderLibraryPage();

    expect(
      await screen.findByRole('img', {
        name: '2 tracks are not stored · Failed 2'
      })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    /* Two of the three are incomplete, and each wears exactly one pill. */
    expect(
      screen.getByRole('img', {
        name: '4 tracks are not stored · Pending 4'
      })
    ).toBeInTheDocument();
    /* Two of the three are incomplete, each wearing exactly one pill; the empty
     * playlist has nothing to miss and stays bare. */
    expect(screen.getAllByRole('img', { name: /not stored/ })).toHaveLength(2);
  });

  it('offers the owner the four actions and the reader no overflow', async () => {
    renderLibraryPage();

    await screen.findByText('Rain On The Window');

    /* One menu: the owned item's. The read collaborator gets no button at all. */
    const menus = screen.getAllByRole('button', {
      name: 'More actions for Rain On The Window'
    });
    expect(menus).toHaveLength(1);

    fireEvent.click(menus[0]);
    expect(screen.getByRole('menuitem', { name: 'Share' })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Rename' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Sync now' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Delete playlist' })
    ).toBeInTheDocument();
  });

  it('opens the playlist from a press on the item itself', async () => {
    renderLibraryPage();

    await screen.findByText('Rain On The Window');

    /* The count is not a link or a control, so the press is the item's own. */
    fireEvent.click(screen.getByText('1'));

    expect(await screen.findByText('detail')).toBeInTheDocument();
  });

  it("names a shared item's owner and leaves the owned item unlined", async () => {
    renderLibraryPage();

    await screen.findByText('Shared Mix');

    expect(screen.getByText('Shared by Ada')).toBeInTheDocument();
    /* One line only: the owned item carries none. */
    expect(screen.getAllByText(/Shared by/)).toHaveLength(1);
  });

  it('falls back to the indicator when the owner is not in the directory', async () => {
    directoryOf('account-9');
    renderLibraryPage();

    await screen.findByText('Shared Mix');

    expect(screen.queryByText(/Shared by/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'You are a collaborator' })
    ).toBeInTheDocument();
  });

  it('drops a revoked playlist on the next list read and changes nothing else', async () => {
    /*
     * The create invalidates the list, so the read that follows is a real second
     * read. In this fixture the shared playlist has been revoked in the meantime,
     * so that read carries the owned one alone.
     */
    let read = 0;
    server.use(
      http.post('http://localhost:3000/api/v1/playlists', () =>
        HttpResponse.json(syncRun, { status: 202 })
      ),
      http.get('http://localhost:3000/api/v1/playlists', () => {
        read += 1;
        if (read === 1) {
          return HttpResponse.json({
            items: [
              {
                id: 'playlist-1',
                ownerAccountId: 'account-1',
                name: 'Rain On The Window',
                coverTrackId: null,
                provider: 'youtube',
                sourcePlaylistId: 'PL-demo',
                syncStatus: 'idle',
                lastSyncedAt: '2026-09-29T12:00:00.000Z',
                trackCount: 1,
                skipNonMusic: true,
                sort: 'playlist',
                access: 'owner',
                hasShares: false,
                counts: { ...EMPTY_COUNTS, stored: 1 },
                createdAt: '2026-09-01T00:00:00.000Z',
                updatedAt: '2026-09-29T12:00:00.000Z'
              },
              {
                id: 'playlist-2',
                ownerAccountId: 'account-2',
                name: 'Shared Mix',
                coverTrackId: null,
                provider: 'youtube',
                sourcePlaylistId: 'PL-shared',
                syncStatus: 'idle',
                lastSyncedAt: '2026-09-28T12:00:00.000Z',
                trackCount: 4,
                skipNonMusic: true,
                sort: 'playlist',
                access: 'read',
                hasShares: false,
                counts: { ...EMPTY_COUNTS, stored: 4 },
                createdAt: '2026-09-01T00:00:00.000Z',
                updatedAt: '2026-09-28T12:00:00.000Z'
              }
            ],
            total: 2,
            limit: 50,
            offset: 0
          });
        }

        return HttpResponse.json({
          items: [
            {
              id: 'playlist-1',
              ownerAccountId: 'account-1',
              name: 'Rain On The Window',
              coverTrackId: null,
              provider: 'youtube',
              sourcePlaylistId: 'PL-demo',
              syncStatus: 'idle',
              lastSyncedAt: '2026-09-29T12:00:00.000Z',
              trackCount: 1,
              skipNonMusic: true,
              sort: 'playlist',
              access: 'owner',
              hasShares: false,
              counts: { ...EMPTY_COUNTS, stored: 1 },
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-29T12:00:00.000Z'
            }
          ],
          total: 1,
          limit: 50,
          offset: 0
        });
      })
    );
    renderLibraryPage();

    await screen.findByText('Shared Mix');
    fireEvent.click(screen.getByRole('button', { name: 'Add a playlist' }));
    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PL-new' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(screen.queryByText('Shared Mix')).not.toBeInTheDocument()
    );
    expect(screen.getByText('Rain On The Window')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('has no search, sort, filter or pagination control', async () => {
    renderLibraryPage();

    await screen.findByText('Rain On The Window');

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /next|previous|page/i })
    ).not.toBeInTheDocument();
  });

  it('renders the empty gallery when the account has no playlists', async () => {
    emptyPage();
    renderLibraryPage();

    expect(await screen.findByText('No playlists yet')).toBeInTheDocument();
    /*
     * One invitation, not two: the header's add is suppressed on the empty state
     * so the gallery's framed action is the only control, and the two never
     * duplicate.
     */
    expect(
      screen.getAllByRole('button', { name: 'Add a playlist' })
    ).toHaveLength(1);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('never renders the playlist empty state on the library', async () => {
    emptyPage();
    renderLibraryPage();

    await screen.findByText('No playlists yet');

    expect(
      screen.queryByRole('button', { name: 'Sync now' })
    ).not.toBeInTheDocument();
  });

  it('renders the library error state, not the empty gallery, when the read fails', async () => {
    failedPage();
    renderLibraryPage();

    /* The server's own detail, and the one control that refetches the read. */
    expect(
      await screen.findByText('The library is unavailable.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
    expect(screen.queryByText('No playlists yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows the fallback sentence when the failed read carries no detail', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Service unavailable',
            status: 503,
            code: 'service_unavailable'
          },
          { status: 503 }
        )
      )
    );
    renderLibraryPage();

    expect(
      await screen.findByText('Playlists could not be loaded.')
    ).toBeInTheDocument();
  });

  it('recovers the library when the failed read is retried', async () => {
    let attempts = 0;
    server.use(
      http.get('http://localhost:3000/api/v1/playlists', () => {
        attempts += 1;

        if (attempts === 1) {
          return HttpResponse.json(
            {
              type: 'about:blank',
              title: 'Service unavailable',
              status: 503,
              detail: 'The library is unavailable.',
              code: 'service_unavailable'
            },
            { status: 503 }
          );
        }

        return HttpResponse.json({
          items: baseItems,
          total: 1,
          limit: 50,
          offset: 0
        });
      })
    );
    renderLibraryPage();

    await screen.findByText('The library is unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Rain On The Window')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try again' })
    ).not.toBeInTheDocument();
  });

  it('starts the pressed playlist, shuffled, from the library', async () => {
    renderLibraryPage();

    await screen.findByText('Rain On The Window');
    fireEvent.click(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    );

    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );

    const state = usePlayerStore.getState();

    expect(state.shuffle).toBe(true);
    expect(state.isPlaying).toBe(true);
    expect(state.queue[0].playlistId).toBe('playlist-1');
    /* The shuffled queue starts on a random stored track, so the draw is asserted
     * by membership rather than by name. */
    expect(['track-1', 'track-2']).toContain(state.currentId);
    expect(state.queue[0].id).toBe(state.currentId);
    expect(new Set(state.queue.map(item => item.id))).toEqual(
      new Set(['track-1', 'track-2'])
    );
  });

  /*
   * The arrangement is the width's: the card at the phone breakpoint, where a
   * gallery of tiles would be one playlist per screen, and the tile above it.
   */
  it('draws the card at the phone width and the tile above it', async () => {
    const restore = stubViewport(MOBILE_QUERY);

    try {
      const { container, unmount } = renderLibraryPage();

      await screen.findByText('Rain On The Window');

      expect(
        container.querySelector('[data-arrangement="card"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-arrangement="tile"]')
      ).not.toBeInTheDocument();

      unmount();
    } finally {
      restore();
    }

    const { container: desk } = renderLibraryPage();

    await screen.findByText('Rain On The Window');

    expect(desk.querySelector('[data-arrangement="tile"]')).toBeInTheDocument();
    expect(
      desk.querySelector('[data-arrangement="card"]')
    ).not.toBeInTheDocument();
  });

  /* The add control follows the width: a labelled button in the header where there
   * is room for a word, and a floating round button on the frame's corner where the
   * header's height is the gallery's. One of the two is drawn at a time. */
  it('offers the add control as a floating button at the phone width', async () => {
    const restore = stubViewport(MOBILE_QUERY);

    try {
      renderLibraryPage();

      await screen.findByText('Rain On The Window');

      const add = screen.getByRole('button', { name: 'Add a playlist' });

      fireEvent.click(add);
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  /* The card's band is the only play in the library, and it starts the playlist in
   * the playlist's own order rather than shuffled. */
  it('starts the playlist in its own order from the card’s play', async () => {
    const restore = stubViewport(MOBILE_QUERY);

    try {
      renderLibraryPage();

      await screen.findByText('Rain On The Window');
      fireEvent.click(
        screen.getAllByRole('button', { name: 'Play this playlist' })[0]
      );

      await waitFor(() =>
        expect(usePlayerStore.getState().queue).toHaveLength(2)
      );

      const state = usePlayerStore.getState();

      expect(state.shuffle).toBe(false);
      expect(state.isPlaying).toBe(true);
      expect(state.currentId).toBe('track-1');
      expect(state.queue.map(item => item.id)).toEqual(['track-1', 'track-2']);
    } finally {
      restore();
    }
  });

  it('refuses to shuffle a playlist with nothing stored yet', async () => {
    const tracks = ['track-1', 'track-2', 'track-3'].map((id, index) => ({
      track: {
        id,
        provider: 'youtube',
        videoId: `video-${index + 1}`,
        title: `Track ${index + 1}`,
        durationSeconds: 200,
        skipNonMusic: true,
        thumbnailPath: null,
        fileStatus: 'stored',
        sourceStatus: 'available',
        failureReason: null,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-29T12:00:00.000Z'
      },
      origin: 'remote',
      position: index
    }));

    server.use(
      http.get('http://localhost:3000/api/v1/playlists/playlist-1/queue', () =>
        HttpResponse.json({ items: tracks })
      ),
      http.get('http://localhost:3000/api/v1/playlists/playlist-2/queue', () =>
        HttpResponse.json({
          items: [
            {
              track: {
                id: 'track-8',
                provider: 'youtube',
                videoId: 'video-8',
                title: 'Still Downloading',
                durationSeconds: 200,
                skipNonMusic: true,
                thumbnailPath: null,
                fileStatus: 'pending',
                sourceStatus: 'available',
                failureReason: null,
                createdAt: '2026-09-01T00:00:00.000Z',
                updatedAt: '2026-09-29T12:00:00.000Z'
              },
              origin: 'remote',
              position: 0
            }
          ]
        })
      )
    );

    renderLibraryPage();

    await screen.findByText('Rain On The Window');
    fireEvent.click(screen.getByRole('button', { name: 'Shuffle Shared Mix' }));

    expect(
      await screen.findByText('Nothing to play in “Shared Mix”.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('No track in it has finished downloading.')
    ).toBeInTheDocument();
    expect(usePlayerStore.getState().queue).toHaveLength(0);
  });

  it('opens the dialog from the gallery invitation on the empty state', async () => {
    emptyPage();
    renderLibraryPage();

    await screen.findByText('No playlists yet');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add a playlist' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('submits a valid URL, closes the dialog and stays in the library', async () => {
    const { requests } = createSucceeds();
    renderLibraryPage();

    await screen.findByText('Rain On The Window');
    fireEvent.click(screen.getByRole('button', { name: 'Add a playlist' }));
    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PL-new' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('New Mix')).toBeInTheDocument();
    /*
     * Success is a close like any other: the dialog is still there while its fade
     * runs, and the fade is what takes it away. The item has already arrived.
     */
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await waitForDialogExit();

    expect(requests).toHaveLength(1);
    expect(requests[0].headers.get('X-PlayLiberty-Client')).toBe('web');
    await expect(requests[0].json()).resolves.toEqual({
      url: 'https://www.youtube.com/playlist?list=PL-new',
      skipNonMusic: true
    });
  });

  it('sends the setting off when the control is turned off before adding', async () => {
    const { requests } = createSucceeds();
    renderLibraryPage();

    await screen.findByText('Rain On The Window');
    fireEvent.click(screen.getByRole('button', { name: 'Add a playlist' }));
    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PL-new' }
    });
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Skip non-music parts' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('New Mix')).toBeInTheDocument();
    await waitForDialogExit();

    expect(requests).toHaveLength(1);
    await expect(requests[0].json()).resolves.toEqual({
      url: 'https://www.youtube.com/playlist?list=PL-new',
      skipNonMusic: false
    });
  });

  it('shows the new item from the server already marked as syncing', async () => {
    createSucceeds();
    renderLibraryPage();

    await screen.findByText('Rain On The Window');
    fireEvent.click(screen.getByRole('button', { name: 'Add a playlist' }));
    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PL-new' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('New Mix')).toBeInTheDocument();
    expect(screen.getByText('Syncing')).toBeInTheDocument();
  });

  it('makes no request for an empty URL and shows the schema refusal', async () => {
    const { requests } = createSucceeds();
    renderLibraryPage();

    await screen.findByText('Rain On The Window');
    fireEvent.click(screen.getByRole('button', { name: 'Add a playlist' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows the server problem beside the field when the create is refused', async () => {
    createRefused();
    renderLibraryPage();

    await screen.findByText('Rain On The Window');
    fireEvent.click(screen.getByRole('button', { name: 'Add a playlist' }));
    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'https://vimeo.com/album/12345' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('names the playlist a second delete replaces', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists', () =>
        HttpResponse.json({
          items: [
            ownedItem('playlist-1', 'Rain On The Window'),
            ownedItem('playlist-2', 'Night Bus')
          ],
          total: 2,
          limit: 50,
          offset: 0
        })
      )
    );
    renderLibraryPage();

    await screen.findByText('Rain On The Window');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete playlist' }));

    expect(screen.getByRole('status')).toHaveTextContent('Rain On The Window');

    fireEvent.click(
      screen.getByRole('button', { name: 'More actions for Night Bus' })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete playlist' }));

    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('Night Bus');
    expect(toast).toHaveTextContent('“Rain On The Window” will not be deleted');
  });

  it('marks a playlist pending while its delete waits, and lifts it on Cancel', async () => {
    const { container } = renderLibraryPage();

    await screen.findByText('Rain On The Window');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete playlist' }));

    /* The tile the toast names is marked: dimmed, busy, and its door and controls
     * disabled, so the thing that is going cannot be opened or deleted again. */
    const row = container.querySelector('[data-arrangement="tile"]');
    expect(row).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    ).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toBeEnabled();
  });

  it('switches the library to French at once and remembers the choice', async () => {
    renderLibraryPage();

    await screen.findByText('Rain On The Window');

    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Français' }));

    expect(
      screen.getByRole('button', { name: 'Ajouter une playlist' })
    ).toBeInTheDocument();
    expect(window.localStorage.getItem('playliberty.language')).toBe('fr');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('renders in the remembered language on the next visit', async () => {
    window.localStorage.setItem('playliberty.language', 'fr');
    renderLibraryPage();

    expect(
      await screen.findByRole('button', { name: 'Ajouter une playlist' })
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('fr');
  });
});
