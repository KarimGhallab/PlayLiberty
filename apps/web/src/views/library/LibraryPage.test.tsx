import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { HttpResponse, http } from 'msw';
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

  it('has no search, sort, filter or pagination control', async () => {
    renderLibraryPage();

    await screen.findByText('Rain On The Window');

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /next|previous|page/i })
    ).not.toBeInTheDocument();
  });

  it('renders the empty shelf when the account has no playlists', async () => {
    emptyPage();
    renderLibraryPage();

    expect(await screen.findByText('No playlists yet')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add a playlist' })
    ).toBeInTheDocument();
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

  it('renders the library error state, not the empty shelf, when the read fails', async () => {
    failedPage();
    renderLibraryPage();

    expect(
      await screen.findByText('Playlists could not be loaded.')
    ).toBeInTheDocument();
    expect(screen.queryByText('No playlists yet')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add a playlist' })
    ).not.toBeInTheDocument();
  });
});
