import type { QueryClient } from '@tanstack/react-query';
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  notFound
} from '@tanstack/react-router';

import { UserRole } from '@playliberty/contracts';

import { currentAccountQuery } from './shared/api/queries/queries';
import { queryClient } from './shared/api/queryClient';
import { useEventStream } from './shared/api/useEventStream/useEventStream';
import NotFoundPage from './shared/components/NotFoundPage/NotFoundPage';
import PlayerAudio from './shared/player/PlayerAudio/PlayerAudio';
import PlayerBar from './shared/player/PlayerBar/PlayerBar';
import { useDocumentTitle } from './shared/useDocumentTitle/useDocumentTitle';

import EgressPage from './views/egress/EgressPage/EgressPage';
import LibraryPage from './views/library/LibraryPage/LibraryPage';
import PlaylistDetailPage from './views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage';

/*
 * The bar and the audio element are siblings of the outlet, not children of a
 * route, so playback survives navigation. Exported for the shell test.
 */
export function AppShell() {
  /* One connection for the tab, held across navigation rather than reopened. */
  useEventStream();
  /* Derived from the route and the player, so one writer owns it above both. */
  useDocumentTitle();

  return (
    <>
      <Outlet />
      <PlayerBar />
      <PlayerAudio />
    </>
  );
}

interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: AppShell
});

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LibraryPage
});

const playlistDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/playlists/$playlistId',
  component: PlaylistDetailPage
});

const egressRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/egress',
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient
      .query(currentAccountQuery)
      .catch(() => null);

    if (me !== null && me.role !== UserRole.Admin) {
      throw notFound();
    }
  },
  component: EgressPage,
  notFoundComponent: NotFoundPage
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: NotFoundPage
});

export const routeTree = rootRoute.addChildren([
  libraryRoute,
  playlistDetailRoute,
  egressRoute,
  notFoundRoute
]);

export const router = createRouter({
  routeTree,
  context: { queryClient }
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
