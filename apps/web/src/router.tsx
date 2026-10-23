import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';

import { useEventStream } from './shared/api/useEventStream/useEventStream';
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

const rootRoute = createRootRoute({ component: AppShell });

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
  component: EgressPage
});

export const routeTree = rootRoute.addChildren([
  libraryRoute,
  playlistDetailRoute,
  egressRoute
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
