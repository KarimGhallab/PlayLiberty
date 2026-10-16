import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRouter
} from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import { EventStreamContext } from './shared/api/useEventStream/useEventStream';
import { usePlayerStore } from './shared/player/playerStore/playerStore';
import type { PlayerTrack } from './shared/player/types';

import { routeTree } from './router';
import { createFakeEventStream } from './testing/fakeEventStream';

const PLAYLIST = 'playlist-1';

/* The element's `play` is the observable of "the source was not restarted". */
const playMock = vi.fn(() => Promise.resolve());

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
  const eventStream = createFakeEventStream();

  const view = render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider preferred={['en']}>
        <EventStreamContext.Provider value={eventStream.factory}>
          <RouterProvider router={router} />
        </EventStreamContext.Provider>
      </I18nProvider>
    </QueryClientProvider>
  );

  return { router, view };
}

beforeEach(() => {
  usePlayerStore.getState().clear();
  playMock.mockClear();
  /*
   * jsdom's `play` returns undefined, so the element's `.catch` would throw.
   * The shell mounts the real audio element, so its browser half is supplied.
   */
  HTMLMediaElement.prototype.play = playMock as unknown as () => Promise<void>;
  HTMLMediaElement.prototype.pause = vi.fn() as unknown as () => void;
});

describe('AppShell', () => {
  it('keeps the track playing across a route change', async () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [TRACK], TRACK.id);
    const { router } = renderShell(`/playlists/${PLAYLIST}`);

    expect(await screen.findByLabelText('Player')).toBeInTheDocument();
    expect(playMock).toHaveBeenCalledTimes(1);

    await router.navigate({ to: '/' });
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'PlayLiberty' })
      ).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Player')).toBeInTheDocument();
    expect(screen.getByText('Blue In Green')).toBeInTheDocument();
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  /*
   * Only the assembled shell proves the route and the player feed one writer;
   * the owner's own branches are unit-tested.
   */
  it('names the tab after the open playlist, then after the playing track', async () => {
    const { router } = renderShell('/');
    await waitFor(() => {
      expect(document.title).toBe('PlayLiberty');
    });

    await router.navigate({
      to: '/playlists/$playlistId',
      params: { playlistId: PLAYLIST }
    });
    await waitFor(() => {
      expect(document.title).toBe('PlayLiberty - Rain On The Window');
    });

    act(() => {
      usePlayerStore.getState().startQueue(PLAYLIST, [TRACK], TRACK.id);
    });
    await waitFor(() => {
      expect(document.title).toBe(
        'PlayLiberty - Rain On The Window (Blue In Green)'
      );
    });
  });
});
