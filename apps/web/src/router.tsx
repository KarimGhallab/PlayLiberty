import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';

import PlayerAudio from './shared/player/PlayerAudio';
import PlayerBar from './shared/player/PlayerBar';

import LibraryPage from './views/library/LibraryPage';
import PlaylistDetailPage from './views/playlist-detail/PlaylistDetailPage';

/*
 * The shell is the outlet, the player bar and the audio element, and nothing
 * else: there is no sidebar and no persistent chrome. The two routes are the
 * whole web screen inventory.
 */
function AppShell() {
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

const routeTree = rootRoute.addChildren([libraryRoute, playlistDetailRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
