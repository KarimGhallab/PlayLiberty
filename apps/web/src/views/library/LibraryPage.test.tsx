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
import { HttpResponse, delay, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { server } from '../../testing/mocks/server';
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
  coverUrl: null,
  provider: 'youtube',
  sourcePlaylistId: 'PL-new',
  syncStatus: 'syncing',
  lastSyncedAt: null,
  trackCount: 0,
  access: 'owner',
  hasShares: false,
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
    coverUrl: null,
    provider: 'youtube',
    sourcePlaylistId: `PL-${id}`,
    syncStatus: 'idle',
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 1,
    access: 'owner',
    hasShares: false,
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
    coverUrl: null,
    provider: 'youtube',
    sourcePlaylistId: 'PL-demo',
    syncStatus: 'idle',
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 1,
    access: 'owner',
    hasShares: false,
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
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe('LibraryPage', () => {
  afterEach(() => {
    window.localStorage.clear();
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

  it('reserves the shape of the list while the read is pending', async () => {
    /* The read never answers, so the skeleton is the only state on the page. */
    server.use(
      http.get('http://localhost:3000/api/v1/playlists', async () => {
        await delay('infinite');
        return HttpResponse.json({ items: [], total: 0, limit: 50, offset: 0 });
      })
    );

    renderLibraryPage();

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Loading playlists.');
    expect(status.querySelectorAll('[aria-hidden="true"] > *')).toHaveLength(5);
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

  it('orders the items as the route returned them', async () => {
    renderLibraryPage();

    const links = await screen.findAllByRole('link');

    expect(links.map(link => link.textContent)).toEqual([
      'Rain On The Window',
      'Shared Mix'
    ]);
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
                coverUrl: null,
                provider: 'youtube',
                sourcePlaylistId: 'PL-demo',
                syncStatus: 'idle',
                lastSyncedAt: '2026-09-29T12:00:00.000Z',
                trackCount: 1,
                access: 'owner',
                hasShares: false,
                createdAt: '2026-09-01T00:00:00.000Z',
                updatedAt: '2026-09-29T12:00:00.000Z'
              },
              {
                id: 'playlist-2',
                ownerAccountId: 'account-2',
                name: 'Shared Mix',
                coverUrl: null,
                provider: 'youtube',
                sourcePlaylistId: 'PL-shared',
                syncStatus: 'idle',
                lastSyncedAt: '2026-09-28T12:00:00.000Z',
                trackCount: 4,
                access: 'read',
                hasShares: false,
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
              coverUrl: null,
              provider: 'youtube',
              sourcePlaylistId: 'PL-demo',
              syncStatus: 'idle',
              lastSyncedAt: '2026-09-29T12:00:00.000Z',
              trackCount: 1,
              access: 'owner',
              hasShares: false,
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
     * The header's control and the gallery's are the same label by design: the
     * header is chrome in every state and the gallery's is the invitation that
     * stands in for the list. Both are present here.
     */
    expect(
      screen.getAllByRole('button', { name: 'Add a playlist' })
    ).toHaveLength(2);
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

    expect(
      await screen.findByText('Playlists could not be loaded.')
    ).toBeInTheDocument();
    expect(screen.queryByText('No playlists yet')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('opens one dialog from the header and the gallery', async () => {
    emptyPage();
    renderLibraryPage();

    await screen.findByText('No playlists yet');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const [header, gallery] = screen.getAllByRole('button', {
      name: 'Add a playlist'
    });
    fireEvent.click(gallery);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(header).toBeInTheDocument();
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
      url: 'https://www.youtube.com/playlist?list=PL-new'
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
});
