import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import axe from 'axe-core';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider, formatDuration } from '@playliberty/i18n';

import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';
import type { PlayerTrack } from '../../../shared/player/types';
import { MOBILE_QUERY } from '../../../shared/useMediaQuery/useMediaQuery';

import { server } from '../../../testing/mocks/server';
import PlaylistDetailPage from './PlaylistDetailPage';

/*
 * The row-render measurement at the end of this file counts `formatDuration`
 * calls per row, so the formatter is spied while still delegating to the real
 * one: the output the rows draw is unchanged and the call count is the per-row
 * render count. Before the memoization those tests assert against, a queue change
 * re-renders every row, because the page passes a fresh `onPlay` and fresh inline
 * lane callbacks on each render and the row is not memoized.
 */
vi.mock('@playliberty/i18n', async importOriginal => {
  const actual = await importOriginal<typeof import('@playliberty/i18n')>();
  return { ...actual, formatDuration: vi.fn(actual.formatDuration) };
});

const PLAYLIST_ID = 'playlist-1';

function renderDetail(playlistId = PLAYLIST_ID) {
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/playlists/$playlistId',
    component: PlaylistDetailPage
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([detailRoute]),
    history: createMemoryHistory({
      initialEntries: [`/playlists/${playlistId}`]
    })
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider preferred={['en']}>
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>
  );
}

/*
 * The playlist read the skip-setting tests answer with, so a handler can echo the
 * value it was sent without repeating the whole shape.
 */
function playlistJson(skipNonMusic: boolean) {
  return {
    id: 'playlist-1',
    ownerAccountId: 'account-1',
    name: 'Rain On The Window',
    coverTrackId: null,
    provider: 'youtube',
    sourcePlaylistId: 'PL-demo',
    syncStatus: 'idle',
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 3,
    skipNonMusic,
    sort: 'playlist',
    access: 'owner',
    hasShares: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z'
  };
}

/* One association for a tracks page or a queue list, so a paging test states only
 * its ids, titles and positions. */
function trackJson(
  id: string,
  title: string,
  position: number,
  fileStatus = 'stored'
) {
  return {
    track: {
      id,
      provider: 'youtube',
      videoId: `video-${id}`,
      title,
      durationSeconds: 200 + position,
      skipNonMusic: true,
      thumbnailPath: null,
      fileStatus,
      sourceStatus: 'available',
      failureReason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z'
    },
    origin: 'remote',
    position
  };
}

/*
 * The media-query stub answers one query and delegates every other to the
 * global default, so a test can move the viewport without disturbing the
 * `prefers-reduced-motion` checks. The returned function puts the original back,
 * because a stub left in place would follow every later test.
 */
function stubViewport(matchingQuery: string): () => void {
  const original = window.matchMedia;

  window.matchMedia = (query: string) =>
    ({
      matches: query === matchingQuery,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    }) as MediaQueryList;

  return () => {
    window.matchMedia = original;
  };
}

const DURATIONS = { 'track-1': 337, 'track-2': 273, 'track-3': 565 } as const;

/** How many rows rendered, by the duration each row was drawn with. */
function renderedRows(): Map<number, number> {
  const counts = new Map<number, number>();

  for (const [seconds] of vi.mocked(formatDuration).mock.calls) {
    counts.set(seconds, (counts.get(seconds) ?? 0) + 1);
  }

  return counts;
}

function playerTrack(id: keyof typeof DURATIONS): PlayerTrack {
  return {
    id,
    title: id,
    playlistId: PLAYLIST_ID,
    playlistName: 'Rain On The Window',
    durationSeconds: DURATIONS[id],
    thumbnailPath: null
  };
}

function openQueue(): void {
  act(() => {
    usePlayerStore
      .getState()
      .startQueue(
        PLAYLIST_ID,
        [
          playerTrack('track-1'),
          playerTrack('track-2'),
          playerTrack('track-3')
        ],
        'track-2'
      );
  });
}

beforeEach(() => {
  usePlayerStore.getState().clear();
});

describe('PlaylistDetailPage', () => {
  it('offers a labelled way home', async () => {
    renderDetail();

    expect(
      await screen.findByRole('link', { name: 'Back to home' })
    ).toHaveAttribute('href', '/');
  });

  /*
   * The header's two arrangements are different markup, so the viewport decides
   * between them: the web draws the card, whose cover sits above the identity,
   * and a phone draws the row, whose cover sits beside it. The assertion is the
   * attribute the component renders, because that is what picks the markup the
   * rest of the header hangs off.
   */
  it('draws the header as the card at the web width', async () => {
    const { container } = renderDetail();

    await screen.findByRole('button', { name: 'Play this playlist' });

    expect(
      container.querySelector('[data-arrangement="card"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-arrangement="row"]')
    ).not.toBeInTheDocument();
  });

  it('draws the header as the row at the phone width', async () => {
    const restore = stubViewport(MOBILE_QUERY);

    try {
      const { container } = renderDetail();

      await screen.findByRole('button', { name: 'Play this playlist' });

      expect(
        container.querySelector('[data-arrangement="row"]')
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-arrangement="card"]')
      ).not.toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it('lists the playlist tracks that are playable', async () => {
    renderDetail();

    expect(
      await screen.findByRole('button', { name: 'Play Blue In Green' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Play Naima' })
    ).toBeInTheDocument();
  });

  it('offers no play control for a track whose file is not stored', async () => {
    renderDetail();

    /*
     * `Flamenco Sketches` is pending in the fixtures, so it is listed and
     * unplayable. The control is absent rather than disabled: a button that
     * cannot be pressed would claim a track can be heard when it cannot.
     */
    expect(await screen.findByText('Flamenco Sketches')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Play Flamenco Sketches' })
    ).not.toBeInTheDocument();
  });

  it('draws the list in the queue order while the queue is this playlist, shuffled', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Shuffle Rain On The Window' })
    );

    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );

    /*
     * The list is the queue's order, whatever the draw produced: the two stored
     * rows are the playable tracks in the queue's own sequence, and the pending
     * row joins the group before it.
     */
    const queueTitles = usePlayerStore
      .getState()
      .queue.map(track => track.title);
    const titles = screen
      .getAllByRole('button', { name: /^(Play|Pause) / })
      .map(
        button =>
          button.getAttribute('aria-label')?.replace(/^(Play|Pause)\s+/, '') ??
          ''
      )
      .filter(title => title !== 'this playlist');

    expect(titles).toEqual(queueTitles);
  });

  /*
   * The header's shuffle presses on the queue's own playlist, so the detail's
   * control is pressed while this playlist is the queue and unpressed while the
   * queue is another one, even though the player is shuffled either way.
   */
  it('presses the header shuffle while this playlist is the queue', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Shuffle Rain On The Window' })
    );
    await waitFor(() => expect(usePlayerStore.getState().shuffle).toBe(true));

    expect(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('leaves the header shuffle unpressed while the queue is another playlist', async () => {
    /* A shuffled foreign queue, so only the per-playlist half can leave this
     * header unpressed. */
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
      'other-track',
      true
    );

    renderDetail();

    expect(
      await screen.findByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('builds the queue from the pressed track and starts there', async () => {
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Play Naima' }));

    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );

    const state = usePlayerStore.getState();

    expect(state.queue.map(track => track.title)).toEqual([
      'Blue In Green',
      'Naima'
    ]);
    expect(state.queue.every(track => track.playlistId === PLAYLIST_ID)).toBe(
      true
    );
    expect(
      state.queue.every(track => track.playlistName === 'Rain On The Window')
    ).toBe(true);
    expect(state.currentId).toBe('track-2');
    expect(state.isPlaying).toBe(true);
    expect(state.positionSeconds).toBe(0);
  });

  it('moves the playhead inside a shuffled queue rather than rebuilding it', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Shuffle Rain On The Window' })
    );
    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );

    const shuffledQueue = usePlayerStore
      .getState()
      .queue.map(track => track.id);
    /* A row other than the one the draw started on, so the press is a move and not
     * a pause. */
    const target = usePlayerStore
      .getState()
      .queue.find(track => track.id !== usePlayerStore.getState().currentId);

    if (target === undefined) {
      throw new Error('the shuffled queue should hold a second track');
    }

    fireEvent.click(
      await screen.findByRole('button', { name: `Play ${target.title}` })
    );

    const state = usePlayerStore.getState();

    /* The queue the listener can see is the queue that plays: the press moves the
     * cursor and leaves the order, the mode and the position of every entry. */
    expect(state.queue.map(track => track.id)).toEqual(shuffledQueue);
    expect(state.shuffle).toBe(true);
    expect(state.currentId).toBe(target.id);
    expect(state.isPlaying).toBe(true);
  });

  /*
   * The list pages in. The server's total is three and a page is two here, so the
   * first screen draws two rows and the header reads the window; the control
   * loads the rest and the header goes back to the standing total.
   */
  it('pages the list in and reads the displayed count', async () => {
    const all = [
      trackJson('page-1', 'First Page', 0),
      trackJson('page-2', 'Second Page', 1),
      trackJson('page-3', 'Third Page', 2)
    ];
    server.use(
      http.get(
        'http://localhost:3000/api/v1/playlists/playlist-1/tracks',
        ({ request }) => {
          const offset = Number(
            new URL(request.url).searchParams.get('offset') ?? '0'
          );

          return HttpResponse.json({
            items: all.slice(offset, offset + 2),
            total: all.length,
            limit: 2,
            offset
          });
        }
      )
    );
    renderDetail();

    expect(
      await screen.findByRole('button', { name: 'Play First Page' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Play Second Page' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Play Third Page' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('2 of 3 tracks')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(
      await screen.findByRole('button', { name: 'Play Third Page' })
    ).toBeInTheDocument();
    expect(screen.queryByText('2 of 3 tracks')).not.toBeInTheDocument();
  });

  /*
   * The queue comes from the whole-list read, not from the page on screen: the
   * list shows one of two tracks and a press still queues both.
   */
  it('plays the whole playlist from the whole-list read, not the page', async () => {
    const all = [
      trackJson('whole-1', 'Whole One', 0),
      trackJson('whole-2', 'Whole Two', 1)
    ];
    server.use(
      http.get('http://localhost:3000/api/v1/playlists/playlist-1/tracks', () =>
        HttpResponse.json({
          items: all.slice(0, 1),
          total: all.length,
          limit: 1,
          offset: 0
        })
      ),
      http.get('http://localhost:3000/api/v1/playlists/playlist-1/queue', () =>
        HttpResponse.json({ items: all })
      )
    );
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Play this playlist' })
    );

    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );
    expect(usePlayerStore.getState().queue.map(track => track.id)).toEqual([
      'whole-1',
      'whole-2'
    ]);
  });

  /*
   * The queue read behind a press fails, and the header's own play control owns
   * it: the control becomes the retry, a caption sits under the header, and a
   * retry recovers.
   */
  it('owns a failed queue read on the header control and recovers on retry', async () => {
    const all = [
      trackJson('recover-1', 'Recover One', 0),
      trackJson('recover-2', 'Recover Two', 1)
    ];
    let attempts = 0;
    server.use(
      http.get(
        'http://localhost:3000/api/v1/playlists/playlist-1/queue',
        () => {
          attempts += 1;

          if (attempts === 1) {
            return HttpResponse.json(
              {
                type: 'about:blank',
                title: 'Service unavailable',
                status: 503,
                detail: 'The queue is unavailable.',
                code: 'service_unavailable'
              },
              { status: 503 }
            );
          }

          return HttpResponse.json({ items: all });
        }
      )
    );
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Play this playlist' })
    );

    expect(
      await screen.findByRole('button', { name: 'Retry playback' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Playback could not start: the queue was not loaded.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry playback' }));

    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );
    expect(
      screen.queryByRole('button', { name: 'Retry playback' })
    ).not.toBeInTheDocument();
  });

  it('disables the header next when the playing track is the last', async () => {
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Play Naima' }));

    expect(
      await screen.findByRole('button', { name: 'Track next' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skip back' })).toBeEnabled();
  });

  it('toggles playback when the current row is pressed again', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Play Blue In Green' })
    );
    await waitFor(() => expect(usePlayerStore.getState().isPlaying).toBe(true));

    fireEvent.click(
      screen.getByRole('button', { name: 'Pause Blue In Green' })
    );
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('keeps the header steps while paused on this playlist', async () => {
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Play Naima' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Pause this playlist' })
    );

    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(
      screen.getByRole('button', { name: 'Skip back' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Track next' })
    ).toBeInTheDocument();
  });

  it('offers the row menu to a writer, who may remove a track', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Actions for Blue In Green' })
    );

    expect(
      screen.getByRole('menuitem', { name: 'Remove from playlist' })
    ).toBeInTheDocument();
  });

  it('forces a failed track to be fetched whole from its row menu', async () => {
    const posted: string[] = [];
    server.use(
      http.get('http://localhost:3000/api/v1/playlists/playlist-1/tracks', () =>
        HttpResponse.json({
          items: [
            {
              track: {
                id: 'track-9',
                provider: 'youtube',
                videoId: 'video-9',
                title: 'The Great Below',
                durationSeconds: 337,
                skipNonMusic: false,
                thumbnailPath: null,
                fileStatus: 'failed',
                sourceStatus: 'available',
                failureReason:
                  'SponsorBlock lookup failed, will retry on the next sync',
                createdAt: '2026-09-01T00:00:00.000Z',
                updatedAt: '2026-09-29T12:00:00.000Z'
              },
              origin: 'remote',
              position: 0
            }
          ],
          total: 1,
          limit: 50,
          offset: 0
        })
      ),
      http.post(
        'http://localhost:3000/api/v1/tracks/track-9/fetch-whole',
        () => {
          posted.push('fetch-whole');

          return HttpResponse.json({
            id: 'track-9',
            provider: 'youtube',
            videoId: 'video-9',
            title: 'The Great Below',
            durationSeconds: 337,
            skipNonMusic: false,
            thumbnailPath: null,
            fileStatus: 'pending',
            sourceStatus: 'available',
            failureReason: null,
            createdAt: '2026-09-01T00:00:00.000Z',
            updatedAt: '2026-09-29T12:00:00.000Z'
          });
        }
      )
    );
    renderDetail();

    /* The recorded policy is drawn, so the failed track reads as deliberately
     * full length rather than as a trim that failed silently. */
    expect(await screen.findByText('Full length')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for The Great Below' })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Fetch whole' }));

    await waitFor(() => {
      expect(posted).toEqual(['fetch-whole']);
    });
  });

  it('defers a track removal behind a cancellable toast', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Actions for Blue In Green' })
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Remove from playlist' })
    );

    /* The press opens the window; the call waits for its deadline, and the
     * toast speaks in the present because nothing has been removed yet. */
    expect(await screen.findByText('Removing track')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  /*
   * The row the toast names is marked while the removal waits: dimmed, busy, and
   * its play and lane disabled, so a track that is going cannot be played or
   * removed again. Cancel lifts the mark and the row is live again.
   */
  it('marks a track pending while its removal waits, and lifts it on Cancel', async () => {
    const { container } = renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Actions for Blue In Green' })
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Remove from playlist' })
    );

    expect(container.querySelector('li[data-pending="true"]')).toHaveAttribute(
      'aria-busy',
      'true'
    );
    expect(
      screen.getByRole('button', { name: 'Play Blue In Green' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Actions for Blue In Green' })
    ).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.getByRole('button', { name: 'Play Blue In Green' })
    ).toBeEnabled();
  });

  /*
   * The header is the target of the playlist's own deferred delete, so it wears
   * the same mark: dimmed and busy, its door and controls disabled.
   */
  it('marks the header pending while its delete waits', async () => {
    const { container } = renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete playlist' }));

    const header = container.querySelector('[data-arrangement="card"]');
    expect(header).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toBeDisabled();
  });

  /*
   * The playlist's own delete takes its tracks with it: every row wears the same
   * mark, so a track that cannot survive its playlist's deletion stays unplayable
   * while the window waits.
   */
  it('marks the track rows pending while the playlist delete waits', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete playlist' }));

    expect(
      screen.getByRole('button', { name: 'Play Blue In Green' })
    ).toBeDisabled();
  });

  it('cancels a deferred removal', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Actions for Blue In Green' })
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Remove from playlist' })
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Removing track')).not.toBeInTheDocument();
  });

  it('shows Share and Rename to the owner and opens each dialog', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );

    expect(screen.getByRole('menuitem', { name: 'Share' })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Rename' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    expect(
      await screen.findByRole('dialog', { name: 'Rename playlist' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('names the playlist from the playlist read', async () => {
    renderDetail();

    expect(
      await screen.findByRole('heading', { name: 'Rain On The Window' })
    ).toBeInTheDocument();
  });

  it('opens the share dialog with the accounts to share with', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Share' }));

    expect(
      await screen.findByRole('dialog', { name: 'Share playlist' })
    ).toBeInTheDocument();
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Can listen' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Can edit' })
    ).toBeInTheDocument();
  });

  it('recovers the share dialog when its failed read is retried', async () => {
    let attempts = 0;
    server.use(
      http.get(
        'http://localhost:3000/api/v1/playlists/playlist-1/shares',
        () => {
          attempts += 1;

          if (attempts === 1) {
            return HttpResponse.json(
              {
                type: 'about:blank',
                title: 'Service unavailable',
                status: 503,
                detail: 'The shares are unavailable.',
                code: 'service_unavailable'
              },
              { status: 503 }
            );
          }

          return HttpResponse.json([]);
        }
      )
    );
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Share' }));

    expect(
      await screen.findByText('The shares are unavailable.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    /* The dialog's body arrives: the directory's accounts, the reader left out. */
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try again' })
    ).not.toBeInTheDocument();
  });

  it('shows the skip setting as a switch, on and enabled for the owner', async () => {
    renderDetail();

    const control = await screen.findByRole('switch', {
      name: 'Skip non-music parts'
    });

    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(control).toBeEnabled();
  });

  it('flips the switch optimistically and locks it until the server answers', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const bodies: unknown[] = [];
    server.use(
      http.patch(
        'http://localhost:3000/api/v1/playlists/playlist-1/skip-non-music',
        async ({ request }) => {
          bodies.push(await request.json());
          await gate;
          return HttpResponse.json(playlistJson(false));
        }
      )
    );
    renderDetail();

    const control = await screen.findByRole('switch', {
      name: 'Skip non-music parts'
    });
    fireEvent.click(control);

    /* The switch moves before the answer, and is locked while it waits. */
    await waitFor(() => {
      expect(control).toHaveAttribute('aria-checked', 'false');
    });
    expect(control).toBeDisabled();
    expect(bodies).toEqual([{ skipNonMusic: false }]);

    release();
    await waitFor(() => {
      expect(control).toBeEnabled();
    });
  });

  it('puts the switch back and says why when the change is refused', async () => {
    server.use(
      http.patch(
        'http://localhost:3000/api/v1/playlists/playlist-1/skip-non-music',
        () =>
          HttpResponse.json(
            {
              type: 'about:blank',
              title: 'Forbidden',
              status: 403,
              code: 'forbidden',
              detail: 'You cannot change this playlist.'
            },
            { status: 403 }
          )
      )
    );
    renderDetail();

    const control = await screen.findByRole('switch', {
      name: 'Skip non-music parts'
    });
    fireEvent.click(control);

    expect(
      await screen.findByText('The skip setting was not changed.')
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(control).toHaveAttribute('aria-checked', 'true');
    });
  });

  it('shows a read failure rather than an empty list', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists/playlist-1/tracks', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Service unavailable',
            status: 503,
            detail: 'The tracks are unavailable.',
            code: 'service_unavailable'
          },
          { status: 503 }
        )
      )
    );
    renderDetail();

    expect(
      await screen.findByText('The tracks are unavailable.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
    expect(screen.queryByText('No tracks yet.')).not.toBeInTheDocument();
  });

  it('recovers the track list when the failed read is retried', async () => {
    let attempts = 0;
    server.use(
      http.get(
        'http://localhost:3000/api/v1/playlists/playlist-1/tracks',
        () => {
          attempts += 1;

          if (attempts === 1) {
            return HttpResponse.json(
              {
                type: 'about:blank',
                title: 'Service unavailable',
                status: 503,
                detail: 'The tracks are unavailable.',
                code: 'service_unavailable'
              },
              { status: 503 }
            );
          }

          return HttpResponse.json({
            items: [
              {
                track: {
                  id: 'track-1',
                  provider: 'youtube',
                  videoId: 'video-1',
                  title: 'Blue In Green',
                  durationSeconds: 337,
                  skipNonMusic: true,
                  thumbnailPath: null,
                  fileStatus: 'stored',
                  sourceStatus: 'available',
                  failureReason: null,
                  createdAt: '2026-09-01T00:00:00.000Z',
                  updatedAt: '2026-09-29T12:00:00.000Z'
                },
                origin: 'remote',
                position: 0
              }
            ],
            total: 1,
            limit: 50,
            offset: 0
          });
        }
      )
    );
    renderDetail();

    await screen.findByText('The tracks are unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('button', { name: 'Play Blue In Green' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try again' })
    ).not.toBeInTheDocument();
  });

  it('shows the not-found state and no header when the playlist 404s', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists/playlist-1', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Not found',
            status: 404,
            detail: 'No playlist with that id.',
            code: 'not_found'
          },
          { status: 404 }
        )
      )
    );
    renderDetail();

    expect(
      await screen.findByRole('heading', { name: 'This playlist is not here' })
    ).toBeInTheDocument();
    /* Neither cause is claimed, and the header for a playlist that is not there
     * is not drawn. */
    expect(screen.queryByText('Rain On The Window')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Nothing here yet' })
    ).not.toBeInTheDocument();
  });

  it('draws the summary of the latest run under the header card', async () => {
    renderDetail();

    expect(await screen.findByText('kept')).toBeInTheDocument();
  });

  /*
   * The failure half of the page's one-state pairing: a playlist the server
   * marked failed draws the band with the run's own reason, the reassurance and
   * the retry, and not the summary. This is the page pairing the status with the
   * reason, which the component test alone cannot prove.
   */
  it('draws the run reason instead of the summary when the sync failed', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists/playlist-1', () =>
        HttpResponse.json({ ...playlistJson(true), syncStatus: 'error' })
      ),
      http.get(
        'http://localhost:3000/api/v1/playlists/playlist-1/sync-runs/latest',
        () =>
          HttpResponse.json({
            id: 'run-1',
            playlistId: 'playlist-1',
            status: 'failed',
            addedCount: 0,
            retainedCount: 3,
            removedCount: 0,
            failedCount: 0,
            startedAt: '2026-09-29T11:59:00.000Z',
            finishedAt: '2026-09-29T12:00:00.000Z',
            error: 'The source playlist is unavailable.'
          })
      )
    );
    renderDetail();

    expect(
      await screen.findByText(
        'Could not reach YouTube, the playlist may not be up to date.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/All 3 tracks are still here and will never be deleted/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sync now' })
    ).toBeInTheDocument();
    expect(screen.queryByText('kept')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    expect(
      screen.getByText('The source playlist is unavailable.')
    ).toBeInTheDocument();
  });

  it('gates the owner overflow on the playlist access', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );

    expect(
      screen.getByRole('menuitem', { name: 'Sync now' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Delete playlist' })
    ).toBeInTheDocument();
  });

  it('draws no overflow at all for a read collaborator', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists/playlist-1', () =>
        HttpResponse.json({
          id: 'playlist-1',
          ownerAccountId: 'account-1',
          name: 'Rain On The Window',
          coverTrackId: null,
          provider: 'youtube',
          sourcePlaylistId: 'PL-demo',
          syncStatus: 'idle',
          lastSyncedAt: '2026-09-29T12:00:00.000Z',
          trackCount: 3,
          skipNonMusic: true,
          sort: 'playlist',
          access: 'read',
          hasShares: false,
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-29T12:00:00.000Z'
        })
      )
    );
    renderDetail();

    await screen.findByRole('heading', { name: 'Rain On The Window' });

    expect(
      screen.queryByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    ).not.toBeInTheDocument();
    /* The add control is the same rule: absent, not disabled. */
    expect(
      screen.queryByRole('button', { name: 'Add a track' })
    ).not.toBeInTheDocument();
    /* The setting is still theirs to read, so the switch is drawn disabled. */
    expect(
      screen.getByRole('switch', { name: 'Skip non-music parts' })
    ).toBeDisabled();
  });

  it('draws the add control for the owner and opens the dialog', async () => {
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Add a track' }));

    expect(
      await screen.findByRole('dialog', { name: 'Add a track' })
    ).toBeInTheDocument();
    /* The current playlist arrives checked, so the common case is one press. */
    expect(
      screen.getByRole('checkbox', { name: 'Rain On The Window' })
    ).toBeChecked();
  });

  it('adds one video to the chosen playlists in one request', async () => {
    const posted: unknown[] = [];
    server.use(
      http.post('http://localhost:3000/api/v1/tracks', async ({ request }) => {
        posted.push(await request.json());

        return HttpResponse.json({
          results: [{ playlistId: 'playlist-1', outcome: 'added' }]
        });
      })
    );
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Add a track' }));
    fireEvent.change(await screen.findByLabelText('Video link'), {
      target: { value: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(posted).toEqual([
        {
          url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
          playlistIds: ['playlist-1']
        }
      ]);
    });
  });

  it('keeps the dialog open and names the playlists that refused', async () => {
    server.use(
      http.get('http://localhost:3000/api/v1/playlists', () =>
        HttpResponse.json({
          items: [
            {
              id: 'playlist-1',
              ownerAccountId: 'account-1',
              name: 'Rain On The Window',
              coverTrackId: null,
              provider: 'youtube',
              sourcePlaylistId: 'PL-demo',
              syncStatus: 'idle',
              lastSyncedAt: '2026-09-29T12:00:00.000Z',
              trackCount: 3,
              skipNonMusic: true,
              sort: 'playlist',
              access: 'owner',
              hasShares: false,
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-29T12:00:00.000Z'
            },
            {
              id: 'playlist-9',
              ownerAccountId: 'account-1',
              name: 'Night Bus',
              coverTrackId: null,
              provider: 'youtube',
              sourcePlaylistId: 'PL-two',
              syncStatus: 'idle',
              lastSyncedAt: '2026-09-29T12:00:00.000Z',
              trackCount: 1,
              skipNonMusic: true,
              sort: 'playlist',
              access: 'owner',
              hasShares: false,
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-29T12:00:00.000Z'
            }
          ],
          total: 2,
          limit: 50,
          offset: 0
        })
      ),
      http.post('http://localhost:3000/api/v1/tracks', () =>
        HttpResponse.json({
          results: [
            { playlistId: 'playlist-1', outcome: 'added' },
            { playlistId: 'playlist-9', outcome: 'refused' }
          ]
        })
      )
    );
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Add a track' }));
    fireEvent.change(await screen.findByLabelText('Video link'), {
      target: { value: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    /* The dialog is still open and names the playlist that said no. */
    expect(
      await screen.findByText(/Added to the rest\. Not added to:/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Added to the rest\. Not added to:/).parentElement
    ).toHaveTextContent('Night Bus');
  });

  it('closes the dialog when every playlist took the video', async () => {
    server.use(
      http.post('http://localhost:3000/api/v1/tracks', () =>
        HttpResponse.json({
          results: [
            { playlistId: 'playlist-1', outcome: 'added' },
            { playlistId: 'playlist-2', outcome: 'already_present' }
          ]
        })
      )
    );
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Add a track' }));
    fireEvent.change(await screen.findByLabelText('Video link'), {
      target: { value: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    /* An all-success batch has nothing to read, so the dialog goes, after its
     * exit. */
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Add a track' })
      ).not.toBeInTheDocument();
    });
  });

  it('has no axe violations', async () => {
    const { container } = renderDetail();

    await screen.findByRole('heading', { name: 'Rain On The Window' });

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});

/*
 * The hot list's render count. `formatDuration` is called once per rendered track
 * row with that row's own duration, and the three fixture tracks have distinct
 * durations, so counting calls per argument is a per-row render count.
 */
describe('PlaylistDetailPage row rendering', () => {
  it('re-renders only the row a queue change affects', async () => {
    renderDetail();

    await screen.findByRole('button', { name: 'Play Naima' });

    vi.mocked(formatDuration).mockClear();
    openQueue();

    const counts = renderedRows();

    expect(counts.get(DURATIONS['track-2'])).toBe(1);
    expect(counts.has(DURATIONS['track-1'])).toBe(false);
    expect(counts.has(DURATIONS['track-3'])).toBe(false);
  });

  it('re-renders only the current row on a play/pause change', async () => {
    renderDetail();

    await screen.findByRole('button', { name: 'Play Naima' });

    openQueue();
    vi.mocked(formatDuration).mockClear();

    act(() => {
      usePlayerStore.getState().setPlaying(false);
    });

    const counts = renderedRows();

    expect(counts.get(DURATIONS['track-2'])).toBe(1);
    expect(counts.has(DURATIONS['track-1'])).toBe(false);
    expect(counts.has(DURATIONS['track-3'])).toBe(false);
  });
});
