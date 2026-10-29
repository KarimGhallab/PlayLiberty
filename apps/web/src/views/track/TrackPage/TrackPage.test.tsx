import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { act, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  ProblemCode,
  Provider,
  TrackFileStatus,
  TrackSourceStatus,
  endpoints
} from '@playliberty/contracts';
import type { Track } from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';
import { queuePlaylistId } from '../../../shared/player/types';

import {
  mockUrl,
  problemResponse,
  respond
} from '../../../testing/mocks/handlers';
import { server } from '../../../testing/mocks/server';
import TrackPage from './TrackPage';

const TRACK: Track = {
  id: 'track-1',
  provider: Provider.Youtube,
  videoId: 'video-1',
  title: 'Blue In Green',
  durationSeconds: 337,
  skipNonMusic: true,
  thumbnailPath: null,
  fileStatus: TrackFileStatus.Stored,
  sourceStatus: TrackSourceStatus.Available,
  failureKind: null,
  failureReason: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z'
};

const BARE = {
  id: TRACK.id,
  title: TRACK.title,
  playlistId: null,
  playlistName: null,
  durationSeconds: TRACK.durationSeconds,
  thumbnailPath: TRACK.thumbnailPath
};

function serveTrack(track: Track): void {
  server.use(
    http.get(mockUrl(endpoints.track, { trackId: track.id }), () =>
      respond(endpoints.track, track)
    )
  );
}

function renderTrack(trackId = TRACK.id, state?: Record<string, unknown>) {
  const rootRoute = createRootRoute();
  const trackRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/tracks/$trackId',
    component: TrackPage
  });
  const galleryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <p>gallery</p>
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([trackRoute, galleryRoute]),
    history: createMemoryHistory({
      initialEntries: [`/tracks/${trackId}`]
    })
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  if (state !== undefined) {
    router.history.replace(`/tracks/${trackId}`, state);
  }

  const view = render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider preferred={['en']}>
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>
  );

  return { ...view, router };
}

beforeEach(() => {
  usePlayerStore.getState().clear();
});

describe('TrackPage', () => {
  it('renders the gallery and starts the track on its own', async () => {
    serveTrack(TRACK);
    renderTrack();

    await waitFor(() =>
      expect(usePlayerStore.getState().currentId).toBe(TRACK.id)
    );
    const state = usePlayerStore.getState();

    expect(state.queue).toEqual([BARE]);
    expect(state.positionSeconds).toBe(0);
    expect(state.isPlaying).toBe(true);
    expect(queuePlaylistId(state)).toBeNull();
    expect(
      await screen.findByRole('link', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
  });

  it('leaves a bare queue already at the track alone', async () => {
    usePlayerStore.getState().startBareTrack({
      id: TRACK.id,
      title: TRACK.title,
      durationSeconds: TRACK.durationSeconds,
      thumbnailPath: TRACK.thumbnailPath
    });
    usePlayerStore.getState().setPosition(12);
    usePlayerStore.getState().setPlaying(false);
    serveTrack(TRACK);
    renderTrack();

    await screen.findByRole('link', { name: 'Rain On The Window' });

    expect(usePlayerStore.getState().queue).toEqual([BARE]);
    expect(usePlayerStore.getState().positionSeconds).toBe(12);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('replaces another queue with the bare track', async () => {
    usePlayerStore.getState().startQueue(
      'other-playlist',
      [
        {
          id: 'other-track',
          title: 'Elsewhere',
          playlistId: 'other-playlist',
          playlistName: 'Elsewhere',
          durationSeconds: 100,
          thumbnailPath: null
        }
      ],
      'other-track'
    );
    serveTrack(TRACK);
    renderTrack();

    await waitFor(() =>
      expect(usePlayerStore.getState().currentId).toBe(TRACK.id)
    );

    expect(usePlayerStore.getState().queue).toEqual([BARE]);
    expect(queuePlaylistId(usePlayerStore.getState())).toBeNull();
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it.each([
    [TrackFileStatus.Pending, 'It is not stored yet.'],
    [TrackFileStatus.Failed, 'Its download failed.'],
    [TrackFileStatus.Unavailable, 'Its video is gone and no file was stored.']
  ])('explains a %s track', async (fileStatus, detail) => {
    serveTrack({ ...TRACK, fileStatus });
    renderTrack();

    expect(
      await screen.findByText('Blue In Green cannot play.')
    ).toBeInTheDocument();
    expect(screen.getByText(detail)).toBeInTheDocument();
    expect(usePlayerStore.getState().queue).toEqual([]);
    expect(
      screen.getByRole('link', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
  });

  it('shows the unknown notice for a missing track', async () => {
    server.use(
      http.get(mockUrl(endpoints.track, { trackId: TRACK.id }), () =>
        problemResponse({
          title: 'Track not found',
          status: 404,
          code: ProblemCode.TrackNotFound,
          detail: 'The track does not exist.'
        })
      )
    );
    renderTrack();

    expect(
      await screen.findByText('This track is not available.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The link may be broken, or the track may have been deleted.'
      )
    ).toBeInTheDocument();
    expect(usePlayerStore.getState().queue).toEqual([]);
  });

  it('leaves the track address when the gallery starts another queue', async () => {
    serveTrack(TRACK);
    const { router } = renderTrack();

    await waitFor(() =>
      expect(usePlayerStore.getState().currentId).toBe(TRACK.id)
    );

    act(() =>
      usePlayerStore.getState().startQueue(
        'other-playlist',
        [
          {
            id: 'other-track',
            title: 'Elsewhere',
            playlistId: 'other-playlist',
            playlistName: 'Elsewhere',
            durationSeconds: 100,
            thumbnailPath: null
          }
        ],
        'other-track'
      )
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(await screen.findByText('gallery')).toBeInTheDocument();
  });

  it('keeps the track address when the entry cannot play under another queue', async () => {
    usePlayerStore.getState().startQueue(
      'other-playlist',
      [
        {
          id: 'other-track',
          title: 'Elsewhere',
          playlistId: 'other-playlist',
          playlistName: 'Elsewhere',
          durationSeconds: 100,
          thumbnailPath: null
        }
      ],
      'other-track'
    );
    serveTrack({ ...TRACK, fileStatus: TrackFileStatus.Pending });
    const { router } = renderTrack();

    expect(
      await screen.findByText('Blue In Green cannot play.')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/tracks/${TRACK.id}`)
    );
    expect(usePlayerStore.getState().currentId).toBe('other-track');
  });
});

describe('shared links', () => {
  it('says the track left the playlist when the redirect says so', async () => {
    serveTrack(TRACK);
    renderTrack(TRACK.id, { leftPlaylist: true });

    await waitFor(() =>
      expect(usePlayerStore.getState().currentId).toBe(TRACK.id)
    );
    expect(
      await screen.findByText('Blue In Green is no longer in that playlist.')
    ).toBeInTheDocument();
    expect(screen.getByText('It is playing on its own.')).toBeInTheDocument();
  });
});
