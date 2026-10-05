import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';

import { useEventStream } from './shared/api/useEventStream';
import PlayerAudio from './shared/player/PlayerAudio';
import PlayerBar from './shared/player/PlayerBar';

import LibraryPage from './views/library/LibraryPage';
import PlaylistDetailPage from './views/playlist-detail/PlaylistDetailPage';

/*
 * The shell is the outlet, the player bar and the audio element, and nothing
 * else: there is no sidebar and no persistent chrome. The two routes are the
 * whole web screen inventory.
 *
 * The bar and the audio element are siblings of the outlet rather than children
 * of a route, which is what makes playback survive navigation: a route change
 * re-renders the outlet and leaves both mounted. This is exported so the shell
 * test can mount it over a memory history and watch that hold.
 *
 * The live stream is mounted here for the same reason: one connection for the
 * tab, held across navigation rather than reopened per route.
 */
export function AppShell() {
  useEventStream();

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
