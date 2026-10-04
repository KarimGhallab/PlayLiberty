import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRouter
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlayerStore } from './shared/player/playerStore';
import type { PlayerTrack } from './shared/player/types';

import { routeTree } from './router';

/*
 * The shell is where playback survives navigation, so the claim under test is
 * structural rather than musical: the bar and the audio element are siblings of
 * the outlet, and a route change must therefore leave both mounted. A memory
 * router drives a real navigation between the two routes and the bar and the
 * element are read after the second route has rendered.
 */

const PLAYLIST = 'playlist-1';

const TRACK: PlayerTrack = {
  id: 'track-1',
  title: 'Blue In Green',
  playlistId: PLAYLIST,
  playlistName: 'Rain On The Window',
  durationSeconds: 180,
  thumbnailPath: null
};

function renderShell(initialEntry: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] })
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return { router, view };
}

beforeEach(() => {
  usePlayerStore.getState().clear();
  /*
   * jsdom's `play` returns undefined, so the element's `.catch` on the playback
   * promise would throw. The shell mounts the real audio element, so the browser
   * half it lacks is supplied here.
   */
  HTMLMediaElement.prototype.play = vi.fn(() =>
    Promise.resolve()
  ) as unknown as () => Promise<void>;
  HTMLMediaElement.prototype.pause = vi.fn() as unknown as () => void;
});

describe('AppShell', () => {
  it('keeps the bar and the audio element mounted across a route change', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [TRACK], TRACK.id);
    const { router } = renderShell(`/playlists/${PLAYLIST}`);

    /* The bar and the element are both there on the detail route. */
    expect(await screen.findByLabelText('Player')).toBeInTheDocument();
    expect(document.querySelector('audio')).not.toBeNull();

    /* Navigate to the library. The outlet re-renders; the siblings do not. */
    await router.navigate({ to: '/' });
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Playlists' })
      ).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Player')).toBeInTheDocument();
    expect(screen.getByText('Blue In Green')).toBeInTheDocument();
    expect(document.querySelector('audio')).not.toBeNull();
  });
});
