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

import LibraryPage from './views/library/LibraryPage/LibraryPage';
import PlaylistDetailPage from './views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage';

/*
 * The bar and the audio element are siblings of the outlet rather than children
 * of a route, which is what makes playback survive navigation: a route change
 * re-renders the outlet and leaves both mounted. This is exported so the shell
 * test can mount it over a memory history and watch that hold.
 *
 * The live stream is mounted here for the same reason: one connection for the
 * tab, held across navigation rather than reopened per route.
 *
 * The tab title is written here for the same reason: it is derived from the route
 * and the player together, so it needs one owner above both rather than a writer
 * per route that would fight the player's.
 */
export function AppShell() {
  useEventStream();
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

export const routeTree = rootRoute.addChildren([
  libraryRoute,
  playlistDetailRoute
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
