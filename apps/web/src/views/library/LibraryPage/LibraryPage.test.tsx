import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import axe from 'axe-core';
import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import {
  PinPlaylistInputSchema,
  ProblemCode,
  endpoints
} from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import DeferredToasts from '../../../shared/components/UndoToast/DeferredToasts';
import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';
import { MOBILE_QUERY } from '../../../shared/useMediaQuery/useMediaQuery';

import {
  EMPTY_COUNTS,
  mockUrl,
  problemResponse
} from '../../../testing/mocks/handlers';
import { server } from '../../../testing/mocks/server';
import { stubViewport } from '../../../testing/viewport';
import LibraryPage from './LibraryPage';

function emptyPage() {
  server.use(
    http.get(mockUrl(endpoints.playlists), () =>
      HttpResponse.json({ items: [], total: 0, limit: 50, offset: 0 })
    )
  );
}

function failedPage() {
  server.use(
    http.get(mockUrl(endpoints.playlists), () =>
      problemResponse({
        code: ProblemCode.InternalError,
        status: 503,
        title: 'Service unavailable',
        detail: 'The library is unavailable.'
      })
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
  pinned: false,
  counts: { ...EMPTY_COUNTS, stored: 0 },
  createdAt: '2026-10-03T12:00:00.000Z',
  updatedAt: '2026-10-03T12:00:00.000Z'
};

/* Two of these stand in a list when a test needs two deletable items. */
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
    pinned: false,
    counts: { ...EMPTY_COUNTS, stored: 1 },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z'
  };
}

/*
 * The base handlers' shared item, a read collaborator: a share indicator and
 * no overflow at all.
 */
function sharedItem() {
  return {
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
    pinned: false,
    counts: { ...EMPTY_COUNTS, stored: 4 },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-28T12:00:00.000Z'
  };
}

/*
 * The base handlers' list, repeated so the create flow has a list to leave
 * before it has one to gain.
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
    pinned: false,
    counts: { ...EMPTY_COUNTS, stored: 1 },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z'
  }
];

/*
 * The route's own shape: the create answers the run, and the new playlist
 * arrives from the server on the next read, not in the response.
 */
function createSucceeds(): { requests: Request[] } {
  const requests: Request[] = [];
  let created = false;
  server.use(
    http.post(mockUrl(endpoints.createPlaylist), async ({ request }) => {
      requests.push(request);
      created = true;
      return HttpResponse.json(syncRun, { status: 202 });
    }),
    http.get(mockUrl(endpoints.playlists), () => {
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
 * A directory that misses the shared item's owner (`account-2`), so the item
 * must fall back to its indicator alone.
 */
function directoryOf(ownerId: string): void {
  server.use(
    http.get(mockUrl(endpoints.accounts), () =>
      HttpResponse.json({
        items: [{ id: ownerId, displayName: 'Ada', avatarUrl: null }],
        total: 1,
        limit: 50,
        offset: 0
      })
    )
  );
}

/*
 * The dialog fades out over 180ms; these tests run on real timers, so the exit
 * is awaited rather than advanced.
 */
async function waitForDialogExit(): Promise<void> {
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  );
}

function createRefused(): { requests: Request[] } {
  const requests: Request[] = [];
  server.use(
    http.post(mockUrl(endpoints.createPlaylist), async ({ request }) => {
      requests.push(request);
      return problemResponse({
        code: ProblemCode.InvalidRequest,
        status: 400,
        title: 'Invalid Request',
        detail:
          'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
      });
    })
  );

  return { requests };
}

/* A list read whose items are exactly what the test hands in. */
function pinnedRead(items: ReturnType<typeof ownedItem>[]): void {
  server.use(
    http.get(mockUrl(endpoints.playlists), () =>
      HttpResponse.json({
        items,
        total: items.length,
        limit: 50,
        offset: 0
      })
    )
  );
}

/*
 * A pin write the list read reflects, so the lifted item stays in the section
 * rather than snapping back.
 */
function pinSucceeds(): { bodies: { pinned: boolean }[] } {
  const bodies: { pinned: boolean }[] = [];
  let pinned = false;

  server.use(
    http.patch(
      mockUrl(endpoints.pinPlaylist, { playlistId: 'playlist-1' }),
      async ({ request }) => {
        const body = PinPlaylistInputSchema.parse(await request.json());
        bodies.push(body);
        pinned = body.pinned;

        return HttpResponse.json({
          ...ownedItem('playlist-1', 'Rain On The Window'),
          pinned
        });
      }
    ),
    http.get(mockUrl(endpoints.playlists), () =>
      HttpResponse.json({
        items: [
          { ...ownedItem('playlist-1', 'Rain On The Window'), pinned },
          sharedItem()
        ],
        total: 2,
        limit: 50,
        offset: 0
      })
    )
  );

  return { bodies };
}

/* A pin write the route refuses, so the optimistic lift must be undone. */
function pinFails(): void {
  server.use(
    http.patch(
      mockUrl(endpoints.pinPlaylist, { playlistId: 'playlist-1' }),
      () =>
        problemResponse({
          code: ProblemCode.InternalError,
          status: 500,
          title: 'Internal Server Error',
          detail: 'The pin could not be written.'
        })
    )
  );
}

/*
 * A real router, because every item carries links; the detail route is a stub,
 * since nothing here asserts what it draws.
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
        <DeferredToasts />
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
    const list = screen.getByRole('list');
    expect(within(list).getByText('1')).toBeInTheDocument();
    expect(within(list).getByText('track')).toBeInTheDocument();

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });

  /*
   * Shuffle belongs to the queue, so only the queue's own row reports pressed.
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

  it('filters the gallery by a status its tracks carry', async () => {
    server.use(
      http.get(mockUrl(endpoints.playlists), () =>
        HttpResponse.json({
          items: [
            {
              ...ownedItem('playlist-1', 'Rain On The Window'),
              trackCount: 3,
              counts: { ...EMPTY_COUNTS, stored: 1, failed: 2 }
            },
            {
              ...ownedItem('playlist-2', 'Night Bus'),
              trackCount: 4,
              counts: { ...EMPTY_COUNTS, stored: 4 }
            },
            {
              ...ownedItem('playlist-3', 'High Water'),
              trackCount: 5,
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

    const failed = await screen.findByRole('button', { name: 'Failed 2' });

    expect(
      screen.getByRole('button', { name: 'All 12' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Stored 6' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pending 4' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Downloading 0' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Unavailable 0' })
    ).not.toBeInTheDocument();

    fireEvent.click(failed);

    expect(failed).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Rain On The Window')).toBeInTheDocument();
    expect(screen.queryByText('Night Bus')).not.toBeInTheDocument();
    expect(screen.queryByText('High Water')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'All 12' }));

    expect(screen.getByText('Night Bus')).toBeInTheDocument();
    expect(screen.getByText('High Water')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('draws no status filter when no playlist track has a state', async () => {
    server.use(
      http.get(mockUrl(endpoints.playlists), () =>
        HttpResponse.json({
          items: [
            {
              ...ownedItem('playlist-1', 'Rain On The Window'),
              trackCount: 0,
              counts: EMPTY_COUNTS
            }
          ],
          total: 1,
          limit: 50,
          offset: 0
        })
      )
    );
    renderLibraryPage();

    expect(await screen.findByText('Rain On The Window')).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Filter by' })
    ).not.toBeInTheDocument();
  });

  /* The counts come from the list read, so marking costs it nothing extra. */
  it('marks the playlists the list read reports as incomplete, one pill each', async () => {
    server.use(
      http.get(mockUrl(endpoints.playlists), () =>
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
    expect(
      screen.getByRole('img', {
        name: '4 tracks are not stored · Pending 4'
      })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /not stored/ })).toHaveLength(2);
  });

  it('offers a read collaborator the pin alone', async () => {
    renderLibraryPage();

    await screen.findByText('Shared Mix');

    fireEvent.click(
      screen.getByRole('button', { name: 'More actions for Shared Mix' })
    );

    expect(
      screen.getAllByRole('menuitem').map(item => item.textContent)
    ).toEqual(['Pin']);
  });

  it('draws a flagged item in the named section above the list and not in the list below', async () => {
    pinnedRead([
      { ...ownedItem('playlist-1', 'Rain On The Window'), pinned: true },
      sharedItem()
    ]);
    renderLibraryPage();

    const section = await screen.findByRole('region', { name: 'Pinned' });

    expect(
      within(section).getByRole('link', { name: 'Rain On The Window' })
    ).toBeInTheDocument();

    const lists = screen.getAllByRole('list');
    expect(
      within(lists[0]!).getByRole('link', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
    expect(
      within(lists[1]!).queryByRole('link', { name: 'Rain On The Window' })
    ).not.toBeInTheDocument();
    expect(
      within(lists[1]!).getByRole('link', { name: 'Shared Mix' })
    ).toBeInTheDocument();

    const restSection = screen.getByRole('region', { name: 'Others' });
    expect(
      within(restSection).getByRole('link', { name: 'Shared Mix' })
    ).toBeInTheDocument();
    expect(
      within(restSection).queryByRole('link', { name: 'Rain On The Window' })
    ).not.toBeInTheDocument();
  });

  it('keeps the items below the section in the order the read returned', async () => {
    pinnedRead([
      { ...ownedItem('playlist-1', 'Pinned one'), pinned: true },
      { ...ownedItem('playlist-2', 'Pinned two'), pinned: true },
      ownedItem('playlist-3', 'Rest newer'),
      ownedItem('playlist-4', 'Rest older')
    ]);
    renderLibraryPage();

    await screen.findByRole('region', { name: 'Pinned' });

    const lists = screen.getAllByRole('list');
    const namesIn = (list: HTMLElement) =>
      within(list)
        .getAllByRole('link')
        .map(link => link.textContent);

    expect(namesIn(lists[0]!)).toEqual(['Pinned one', 'Pinned two']);
    expect(namesIn(lists[1]!)).toEqual(['Rest newer', 'Rest older']);
  });

  it('draws no pinned section when the account has pinned nothing', async () => {
    renderLibraryPage();

    await screen.findByText('Rain On The Window');

    expect(
      screen.queryByRole('region', { name: 'Pinned' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Pinned')).not.toBeInTheDocument();
  });

  it('pins from the menu, asking the server and lifting the item into the section', async () => {
    const { bodies } = pinSucceeds();
    renderLibraryPage();

    await screen.findByText('Rain On The Window');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Pin' }));

    const section = await screen.findByRole('region', { name: 'Pinned' });
    expect(
      within(section).getByRole('link', { name: 'Rain On The Window' })
    ).toBeInTheDocument();

    expect(bodies).toEqual([{ pinned: true }]);
  });

  it('puts a refused pin back and draws the notice', async () => {
    pinFails();
    renderLibraryPage();

    await screen.findByText('Rain On The Window');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Pin' }));

    expect(
      await screen.findByText('The pin could not be changed.')
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('region', { name: 'Pinned' })
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('list')).getByRole('link', {
        name: 'Rain On The Window'
      })
    ).toBeInTheDocument();
  });

  it('opens the playlist from a press on the item itself', async () => {
    renderLibraryPage();

    await screen.findByText('Rain On The Window');

    /* The count is not a link or a control, so the press is the item's own. */
    fireEvent.click(within(screen.getByRole('list')).getByText('1'));

    expect(await screen.findByText('detail')).toBeInTheDocument();
  });

  it("names a shared item's owner and leaves the owned item unlined", async () => {
    renderLibraryPage();

    await screen.findByText('Shared Mix');

    expect(screen.getByText('Shared by Ada')).toBeInTheDocument();
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
     * The create invalidates the list, so the read after it is a real second
     * read; this fixture has the shared playlist revoked in the meantime.
     */
    let read = 0;
    server.use(
      http.post(mockUrl(endpoints.createPlaylist), () =>
        HttpResponse.json(syncRun, { status: 202 })
      ),
      http.get(mockUrl(endpoints.playlists), () => {
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
                pinned: false,
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
                pinned: false,
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
              pinned: false,
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

  it('renders the empty gallery when the account has no playlists', async () => {
    emptyPage();
    renderLibraryPage();

    expect(await screen.findByText('No playlists yet')).toBeInTheDocument();
    /* The header's add is suppressed here, so the gallery's action is alone. */
    expect(
      screen.getAllByRole('button', { name: 'Add a playlist' })
    ).toHaveLength(1);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders the library error state, not the empty gallery, when the read fails', async () => {
    failedPage();
    renderLibraryPage();

    expect(
      await screen.findByText('The library is unavailable.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
    expect(screen.queryByText('No playlists yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('recovers the library when the failed read is retried', async () => {
    let attempts = 0;
    server.use(
      http.get(mockUrl(endpoints.playlists), () => {
        attempts += 1;

        if (attempts === 1) {
          return problemResponse({
            code: ProblemCode.InternalError,
            status: 503,
            title: 'Service unavailable',
            detail: 'The library is unavailable.'
          });
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

  it('marks the pressed tile while its queue read is in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const tracks = ['track-1', 'track-2'].map((id, index) => ({
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
      http.get(
        mockUrl(endpoints.playlistQueue, { playlistId: 'playlist-1' }),
        async () => {
          await gate;
          return HttpResponse.json({ items: tracks });
        }
      )
    );
    renderLibraryPage();

    await screen.findByRole('link', { name: 'Rain On The Window' });

    const item = () =>
      screen
        .getByRole('link', { name: 'Rain On The Window' })
        .closest('[data-arrangement]') as HTMLElement;
    const play = () =>
      within(item()).getByRole('button', { name: 'Play Rain On The Window' });
    const otherPlay = () =>
      within(
        screen
          .getByRole('link', { name: 'Shared Mix' })
          .closest('[data-arrangement]') as HTMLElement
      ).getByRole('button', { name: 'Play Shared Mix' });

    fireEvent.click(play());

    await waitFor(() => expect(play()).toBeDisabled());
    expect(play()).toHaveAttribute('aria-busy', 'true');
    expect(otherPlay()).toBeEnabled();

    release();

    await waitFor(() => expect(usePlayerStore.getState().isPlaying).toBe(true));

    expect(usePlayerStore.getState().queue).toHaveLength(2);
    expect(
      within(item()).getByRole('button', {
        name: 'Pause Rain On The Window'
      })
    ).toBeInTheDocument();
  });

  it('draws the play disabled on a playlist with nothing stored', async () => {
    server.use(
      http.get(mockUrl(endpoints.playlists), () =>
        HttpResponse.json({
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
              pinned: false,
              counts: { ...EMPTY_COUNTS, pending: 1 },
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-29T12:00:00.000Z'
            }
          ],
          total: 1,
          limit: 50,
          offset: 0
        })
      )
    );
    renderLibraryPage();

    await screen.findByText('Rain On The Window');

    expect(
      screen.getByRole('button', { name: 'Play Rain On The Window' })
    ).toBeDisabled();
  });

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

  it('starts the playlist in its own order from the card’s play', async () => {
    const restore = stubViewport(MOBILE_QUERY);

    try {
      renderLibraryPage();

      await screen.findByText('Rain On The Window');
      fireEvent.click(
        screen.getByRole('button', { name: 'Play Rain On The Window' })
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
      http.get(
        mockUrl(endpoints.playlistQueue, { playlistId: 'playlist-1' }),
        () => HttpResponse.json({ items: tracks })
      ),
      http.get(
        mockUrl(endpoints.playlistQueue, { playlistId: 'playlist-2' }),
        () =>
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
    /* Success is a close like any other: the fade removes the dialog. */
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

  it('keeps both deleted playlists on their own stacked toasts', async () => {
    server.use(
      http.get(mockUrl(endpoints.playlists), () =>
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

    fireEvent.click(
      screen.getByRole('button', { name: 'More actions for Night Bus' })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete playlist' }));

    const toasts = screen.getAllByRole('status');

    expect(toasts).toHaveLength(2);
    expect(toasts[0]).toHaveTextContent('Night Bus');
    expect(toasts[1]).toHaveTextContent('Rain On The Window');
    expect(
      screen.queryByText('“Rain On The Window” will not be deleted')
    ).not.toBeInTheDocument();
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
