import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import axe from 'axe-core';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ProblemCode,
  SortPlaylistInputSchema,
  SyncRunStatus,
  TrackFileStatus,
  endpoints
} from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import DeferredToasts from '../../../shared/components/UndoToast/DeferredToasts';
import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';

import {
  EMPTY_COUNTS,
  countsOf,
  mockUrl,
  problemResponse,
  respond
} from '../../../testing/mocks/handlers';
import { server } from '../../../testing/mocks/server';
import PlaylistDetailPage from './PlaylistDetailPage';

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
        <DeferredToasts />
      </I18nProvider>
    </QueryClientProvider>
  );
}

/* The playlist read a handler echoes a value into, without the whole shape. */
function playlistJson(skipNonMusic: boolean) {
  return {
    id: 'playlist-1',
    ownerAccountId: 'account-1',
    name: 'Rain On The Window',
    coverTrackId: null,
    coverUpdatedAt: null,
    provider: 'youtube',
    sourcePlaylistId: 'PL-demo',
    syncStatus: 'idle',
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 3,
    skipNonMusic,
    sort: 'playlist',
    access: 'owner',
    hasShares: false,
    pinned: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z'
  };
}

/* One association, so a test states only its ids, titles and positions. */
function trackJson(
  id: string,
  title: string,
  position: number,
  fileStatus: TrackFileStatus = TrackFileStatus.Stored
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

function listTitles(): string[] {
  return screen
    .getAllByRole('button', { name: /^(Play|Pause) / })
    .map(
      button =>
        button.getAttribute('aria-label')?.replace(/^(Play|Pause)\s+/, '') ?? ''
    )
    .filter(title => title !== 'this playlist');
}

beforeEach(() => {
  usePlayerStore.getState().clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('PlaylistDetailPage', () => {
  it('offers a labelled way home', async () => {
    renderDetail();

    expect(
      await screen.findByRole('link', { name: 'Back to home' })
    ).toHaveAttribute('href', '/');
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

  it('draws the list in the queue order while the queue is this playlist, shuffled', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Shuffle Rain On The Window' })
    );

    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );

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

  /*
   * The list pages in: the server's total is three and a page is two, so the
   * first screen draws two rows and the header reads the window.
   */
  it('pages the list in and reads the displayed count', async () => {
    const all = [
      trackJson('page-1', 'First Page', 0),
      trackJson('page-2', 'Second Page', 1),
      trackJson('page-3', 'Third Page', 2)
    ];
    server.use(
      http.get(
        mockUrl(endpoints.playlistTracks, { playlistId: PLAYLIST_ID }),
        ({ request }) => {
          const offset = Number(
            new URL(request.url).searchParams.get('offset') ?? '0'
          );

          return HttpResponse.json({
            items: all.slice(offset, offset + 2),
            total: all.length,
            limit: 2,
            offset,
            counts: countsOf(all)
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
   * The queue comes from the whole-list read, not the page on screen: the list
   * shows one of two tracks and a press still queues both.
   */
  it('plays the whole playlist from the whole-list read, not the page', async () => {
    const all = [
      trackJson('whole-1', 'Whole One', 0),
      trackJson('whole-2', 'Whole Two', 1)
    ];
    server.use(
      http.get(
        mockUrl(endpoints.playlistTracks, { playlistId: PLAYLIST_ID }),
        () =>
          HttpResponse.json({
            items: all.slice(0, 1),
            total: all.length,
            limit: 1,
            offset: 0,
            counts: countsOf(all)
          })
      ),
      http.get(
        mockUrl(endpoints.playlistQueue, { playlistId: PLAYLIST_ID }),
        () => HttpResponse.json({ items: all })
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

  it('disables the header play when the playlist holds no stored track', async () => {
    const associations = [
      trackJson('track-9', 'Still Downloading', 0, TrackFileStatus.Pending)
    ];

    server.use(
      http.get(mockUrl(endpoints.playlist, { playlistId: PLAYLIST_ID }), () =>
        HttpResponse.json(playlistJson(true))
      ),
      http.get(
        mockUrl(endpoints.playlistTracks, { playlistId: PLAYLIST_ID }),
        () =>
          HttpResponse.json({
            items: associations,
            total: 1,
            limit: 50,
            offset: 0,
            counts: { ...EMPTY_COUNTS, pending: 1 }
          })
      ),
      http.get(
        mockUrl(endpoints.playlistQueue, { playlistId: PLAYLIST_ID }),
        () => HttpResponse.json({ items: associations })
      )
    );
    renderDetail();

    expect(
      await screen.findByRole('button', { name: 'Play this playlist' })
    ).toBeDisabled();
  });

  it('owns a failed queue read on the header control and recovers on retry', async () => {
    const all = [
      trackJson('recover-1', 'Recover One', 0),
      trackJson('recover-2', 'Recover Two', 1)
    ];
    let attempts = 0;
    server.use(
      http.get(
        mockUrl(endpoints.playlistQueue, { playlistId: PLAYLIST_ID }),
        () => {
          attempts += 1;

          if (attempts === 1) {
            return problemResponse({
              code: ProblemCode.InternalError,
              status: 503,
              title: 'Service unavailable',
              detail: 'The queue is unavailable.'
            });
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

  it('acknowledges a row press while its queue read is in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    server.use(
      http.get(
        mockUrl(endpoints.playlistQueue, { playlistId: PLAYLIST_ID }),
        async () => {
          await gate;
          return HttpResponse.json({
            items: [
              trackJson('track-1', 'Naima', 0),
              trackJson('track-2', 'Blue In Green', 1)
            ]
          });
        }
      )
    );
    renderDetail();

    const rowPlay = await screen.findByRole('button', {
      name: 'Play Blue In Green'
    });
    fireEvent.click(rowPlay);

    await waitFor(() => expect(rowPlay).toBeDisabled());
    expect(rowPlay.closest('li')).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('button', { name: 'Play this playlist' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Play this playlist' })
    ).not.toHaveAttribute('aria-busy');

    release();

    await waitFor(() => expect(usePlayerStore.getState().isPlaying).toBe(true));

    expect(usePlayerStore.getState().queue).toHaveLength(2);
  });

  it('disables the header next when the playing track is the last', async () => {
    renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: 'Play Naima' }));

    expect(
      await screen.findByRole('button', { name: 'Track next' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Skip back' })).toBeEnabled();
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
      http.get(
        mockUrl(endpoints.playlistTracks, { playlistId: PLAYLIST_ID }),
        () =>
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
            offset: 0,
            counts: { ...EMPTY_COUNTS, failed: 1 }
          })
      ),
      http.post(
        mockUrl(endpoints.fetchTrackWhole, { trackId: 'track-9' }),
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

    expect(await screen.findByText('Removing track')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

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

  it('marks the header pending while its delete waits', async () => {
    const { container } = renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

    const header = container.querySelector('[data-arrangement="card"]');
    expect(header).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('button', { name: 'Shuffle Rain On The Window' })
    ).toBeDisabled();
  });

  /*
   * The playlist's delete takes its tracks with it, so every row wears the same
   * mark while the window waits.
   */
  it('marks the track rows pending while the playlist delete waits', async () => {
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

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

  it('offers Cover to the owner, uploads the file and shows the new cover', async () => {
    const version = '2026-10-20T12:00:00.000Z';
    let coverVersion: string | null = null;
    const uploads: { contentType: string | null; bytes: number }[] = [];

    server.use(
      http.get(mockUrl(endpoints.playlist, { playlistId: PLAYLIST_ID }), () =>
        HttpResponse.json({
          ...playlistJson(true),
          coverUpdatedAt: coverVersion
        })
      ),
      http.post(
        mockUrl(endpoints.setPlaylistCover, { playlistId: PLAYLIST_ID }),
        async ({ request }) => {
          uploads.push({
            contentType: request.headers.get('content-type'),
            bytes: (await request.arrayBuffer()).byteLength
          });
          coverVersion = version;

          return HttpResponse.json({
            ...playlistJson(true),
            coverUpdatedAt: version
          });
        }
      )
    );

    const { container } = renderDetail();
    const opener = await screen.findByRole('button', {
      name: 'More actions for Rain On The Window'
    });

    fireEvent.click(opener);
    expect(
      screen.getByRole('menuitem', { name: 'Update the cover' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Update the cover' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Playlist cover'
    });
    const input = dialog.querySelector<HTMLInputElement>('input[type=file]');
    const file = new File([new Uint8Array([1, 2, 3])], 'cover.jpg', {
      type: 'image/jpeg'
    });

    if (input === null) {
      throw new Error('the cover dialog has no file input');
    }

    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(uploads).toHaveLength(1));

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Playlist cover' })
      ).not.toBeInTheDocument()
    );
    expect(opener).toHaveFocus();

    await waitFor(() =>
      expect(
        container
          .querySelector('[data-arrangement="card"] img')
          ?.getAttribute('src')
      ).toBe(
        `/api/v1/playlists/playlist-1/cover?v=${encodeURIComponent(version)}`
      )
    );

    expect(uploads).toEqual([{ contentType: 'image/jpeg', bytes: 3 }]);
  });

  it('keeps the cover dialog open with one sentence when the save fails', async () => {
    server.use(
      http.post(
        mockUrl(endpoints.setPlaylistCover, { playlistId: PLAYLIST_ID }),
        () =>
          problemResponse({
            code: ProblemCode.InternalError,
            status: 500,
            title: 'Internal Server Error'
          })
      )
    );
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Update the cover' }));

    const dialog = await screen.findByRole('dialog', {
      name: 'Playlist cover'
    });
    const input = dialog.querySelector<HTMLInputElement>('input[type=file]');

    if (input === null) {
      throw new Error('the cover dialog has no file input');
    }

    fireEvent.change(input, {
      target: {
        files: [
          new File([new Uint8Array([1])], 'cover.jpg', {
            type: 'image/jpeg'
          })
        ]
      }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The cover could not be saved.'
    );
    expect(
      screen.getByRole('dialog', { name: 'Playlist cover' })
    ).toBeInTheDocument();
  });

  it('offers Cover to a write collaborator', async () => {
    server.use(
      http.get(mockUrl(endpoints.playlist, { playlistId: PLAYLIST_ID }), () =>
        HttpResponse.json({ ...playlistJson(true), access: 'write' })
      )
    );
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );

    expect(
      screen.getByRole('menuitem', { name: 'Update the cover' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Rename' })
    ).not.toBeInTheDocument();
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

  it('names the account and the reason when a grant is refused', async () => {
    server.use(
      http.post(
        mockUrl(endpoints.grantShare, { playlistId: PLAYLIST_ID }),
        () =>
          problemResponse({
            code: ProblemCode.Forbidden,
            status: 403,
            title: 'Forbidden',
            detail: 'You cannot share this playlist.'
          })
      )
    );
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Share' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Can listen' }));

    expect(
      await screen.findByText('The playlist sharing with Ada has failed.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('You cannot share this playlist.')
    ).toBeInTheDocument();

    /* The server's list is unchanged, so the toggle stays off and usable. */
    const listen = screen.getByRole('button', { name: 'Can listen' });
    expect(listen).toHaveAttribute('aria-pressed', 'false');
    expect(listen).toBeEnabled();
  });

  it('names the account and the reason when removing a share is refused', async () => {
    const share = {
      accountId: 'account-2',
      account: { id: 'account-2', displayName: 'Ada', avatarUrl: null },
      level: 'read',
      createdAt: '2026-09-29T12:00:00.000Z'
    };
    server.use(
      http.get(
        mockUrl(endpoints.playlistShares, { playlistId: PLAYLIST_ID }),
        () => HttpResponse.json([share])
      ),
      http.delete(
        mockUrl(endpoints.revokeShare, {
          playlistId: PLAYLIST_ID,
          accountId: 'account-2'
        }),
        () =>
          problemResponse({
            code: ProblemCode.Forbidden,
            status: 403,
            title: 'Forbidden',
            detail: 'You cannot change this share.'
          })
      )
    );
    renderDetail();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Share' }));

    const listen = await screen.findByRole('button', { name: 'Can listen' });
    expect(listen).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(listen);

    expect(
      await screen.findByText(
        'The playlist sharing with Ada could not be removed.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('You cannot change this share.')
    ).toBeInTheDocument();

    /* The share still stands, so the pressed toggle tells the truth. */
    expect(screen.getByRole('button', { name: 'Can listen' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('recovers the share dialog when its failed read is retried', async () => {
    let attempts = 0;
    server.use(
      http.get(
        mockUrl(endpoints.playlistShares, { playlistId: PLAYLIST_ID }),
        () => {
          attempts += 1;

          if (attempts === 1) {
            return problemResponse({
              code: ProblemCode.InternalError,
              status: 503,
              title: 'Service unavailable',
              detail: 'The shares are unavailable.'
            });
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

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Try again' })
    ).not.toBeInTheDocument();
  });

  it('flips the switch optimistically and locks it until the server answers', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const bodies: unknown[] = [];
    server.use(
      http.patch(
        mockUrl(endpoints.skipNonMusic, { playlistId: PLAYLIST_ID }),
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
        mockUrl(endpoints.skipNonMusic, { playlistId: PLAYLIST_ID }),
        () =>
          problemResponse({
            code: ProblemCode.Forbidden,
            status: 403,
            title: 'Forbidden',
            detail: 'You cannot change this playlist.'
          })
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
      http.get(
        mockUrl(endpoints.playlistTracks, { playlistId: PLAYLIST_ID }),
        () =>
          problemResponse({
            code: ProblemCode.InternalError,
            status: 503,
            title: 'Service unavailable',
            detail: 'The tracks are unavailable.'
          })
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
        mockUrl(endpoints.playlistTracks, { playlistId: PLAYLIST_ID }),
        () => {
          attempts += 1;

          if (attempts === 1) {
            return problemResponse({
              code: ProblemCode.InternalError,
              status: 503,
              title: 'Service unavailable',
              detail: 'The tracks are unavailable.'
            });
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
            offset: 0,
            counts: { ...EMPTY_COUNTS, stored: 1 }
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
      http.get(mockUrl(endpoints.playlist, { playlistId: PLAYLIST_ID }), () =>
        problemResponse({
          code: ProblemCode.NotFound,
          status: 404,
          title: 'Not found',
          detail: 'No playlist with that id.'
        })
      )
    );
    renderDetail();

    expect(
      await screen.findByRole('heading', { name: 'This playlist is not here' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Rain On The Window')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Nothing here yet' })
    ).not.toBeInTheDocument();
  });

  it('draws the summary of the latest run under the header card', async () => {
    renderDetail();

    expect(await screen.findByText('kept')).toBeInTheDocument();
  });

  /* The run settled with nothing failed; the downloads failed afterwards, so
   * the band must read the same failure figure as the chips and the rows. */
  it('draws the tracks failed when the run settled cleanly', async () => {
    const all = [
      trackJson('failed-1', 'Failed One', 0, TrackFileStatus.Failed),
      trackJson('failed-2', 'Failed Two', 1, TrackFileStatus.Failed),
      trackJson('failed-3', 'Failed Three', 2, TrackFileStatus.Failed),
      trackJson('failed-4', 'Failed Four', 3, TrackFileStatus.Failed)
    ];
    server.use(
      http.get(mockUrl(endpoints.playlist, { playlistId: PLAYLIST_ID }), () =>
        HttpResponse.json({ ...playlistJson(true), trackCount: all.length })
      ),
      http.get(
        mockUrl(endpoints.latestSyncRun, { playlistId: PLAYLIST_ID }),
        () =>
          HttpResponse.json({
            id: 'run-1',
            playlistId: 'playlist-1',
            status: 'completed',
            addedCount: 4,
            retainedCount: 0,
            removedCount: 0,
            failedCount: 0,
            startedAt: '2026-09-29T11:59:00.000Z',
            finishedAt: '2026-09-29T12:00:00.000Z',
            error: null
          })
      ),
      http.get(
        mockUrl(endpoints.playlistTracks, { playlistId: PLAYLIST_ID }),
        () =>
          HttpResponse.json({
            items: all,
            total: all.length,
            limit: 50,
            offset: 0,
            counts: countsOf(all)
          })
      )
    );
    renderDetail();

    expect(
      await screen.findByRole('group', { name: '4 failed' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Failed 4' })
    ).toBeInTheDocument();
  });

  /*
   * The page pairs the status with the run's reason, which the component test
   * alone cannot prove.
   */
  it('draws the run reason instead of the summary when the sync failed', async () => {
    server.use(
      http.get(mockUrl(endpoints.playlist, { playlistId: PLAYLIST_ID }), () =>
        HttpResponse.json({ ...playlistJson(true), syncStatus: 'error' })
      ),
      http.get(
        mockUrl(endpoints.latestSyncRun, { playlistId: PLAYLIST_ID }),
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
    expect(screen.getByRole('button', { name: 'Sync' })).toBeInTheDocument();
    expect(screen.queryByText('kept')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    expect(
      screen.getByText('The source playlist is unavailable.')
    ).toBeInTheDocument();
  });

  it('draws no overflow at all for a read collaborator', async () => {
    server.use(
      http.get(mockUrl(endpoints.playlist, { playlistId: PLAYLIST_ID }), () =>
        HttpResponse.json({
          id: 'playlist-1',
          ownerAccountId: 'account-1',
          name: 'Rain On The Window',
          coverTrackId: null,
          coverUpdatedAt: null,
          provider: 'youtube',
          sourcePlaylistId: 'PL-demo',
          syncStatus: 'idle',
          lastSyncedAt: '2026-09-29T12:00:00.000Z',
          trackCount: 3,
          skipNonMusic: true,
          sort: 'playlist',
          access: 'read',
          hasShares: false,
          pinned: false,
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
    /* So is the named sync: a reader cannot start a run. */
    expect(
      screen.queryByRole('button', { name: 'Sync' })
    ).not.toBeInTheDocument();
    /* The setting is still theirs to read, so the switch is drawn disabled. */
    expect(
      screen.getByRole('switch', { name: 'Skip non-music parts' })
    ).toBeDisabled();
  });

  it('starts a sync from the header without opening the overflow', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const posts: string[] = [];
    server.use(
      http.post(
        mockUrl(endpoints.syncPlaylist, { playlistId: PLAYLIST_ID }),
        async () => {
          posts.push('sync');
          await gate;

          return respond(
            endpoints.syncPlaylist,
            {
              id: 'run-header',
              playlistId: PLAYLIST_ID,
              status: SyncRunStatus.Running,
              addedCount: 0,
              retainedCount: 0,
              removedCount: 0,
              failedCount: 0,
              startedAt: '2026-09-29T12:00:00.000Z',
              finishedAt: null,
              error: null
            },
            202
          );
        }
      )
    );
    renderDetail();

    const control = await screen.findByRole('button', { name: 'Sync now' });
    fireEvent.click(control);

    await waitFor(() => {
      expect(posts).toHaveLength(1);
      expect(control).toHaveAccessibleName('Syncing');
    });
    expect(screen.getAllByText('Syncing')).toHaveLength(1);
    expect(control).toBeDisabled();

    /* A second press on the busy control cannot start another run. */
    fireEvent.click(control);
    expect(posts).toHaveLength(1);

    release();
    await waitFor(() => {
      expect(control).toHaveAccessibleName('Sync now');
    });
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
      http.post(mockUrl(endpoints.addTrack), async ({ request }) => {
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
      http.get(mockUrl(endpoints.playlists), () =>
        HttpResponse.json({
          items: [
            {
              id: 'playlist-1',
              ownerAccountId: 'account-1',
              name: 'Rain On The Window',
              coverTrackId: null,
              coverUpdatedAt: null,
              provider: 'youtube',
              sourcePlaylistId: 'PL-demo',
              syncStatus: 'idle',
              lastSyncedAt: '2026-09-29T12:00:00.000Z',
              trackCount: 3,
              skipNonMusic: true,
              sort: 'playlist',
              access: 'owner',
              hasShares: false,
              pinned: false,
              counts: { ...EMPTY_COUNTS, stored: 3 },
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-29T12:00:00.000Z'
            },
            {
              id: 'playlist-9',
              ownerAccountId: 'account-1',
              name: 'Night Bus',
              coverTrackId: null,
              coverUpdatedAt: null,
              provider: 'youtube',
              sourcePlaylistId: 'PL-two',
              syncStatus: 'idle',
              lastSyncedAt: '2026-09-29T12:00:00.000Z',
              trackCount: 1,
              skipNonMusic: true,
              sort: 'playlist',
              access: 'owner',
              hasShares: false,
              pinned: false,
              counts: { ...EMPTY_COUNTS, stored: 3 },
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-29T12:00:00.000Z'
            }
          ],
          total: 2,
          limit: 50,
          offset: 0
        })
      ),
      http.post(mockUrl(endpoints.addTrack), () =>
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

    expect(
      await screen.findByText(/Added to the rest\. Not added to:/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Added to the rest\. Not added to:/).parentElement
    ).toHaveTextContent('Night Bus');
  });

  it('closes the dialog when every playlist took the video', async () => {
    server.use(
      http.post(mockUrl(endpoints.addTrack), () =>
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

    /* An all-success batch has nothing to read, so the dialog goes. */
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
 * The control is presentational: the page saves the order, re-asks the reads
 * and reports a refusal.
 */
describe('PlaylistDetailPage sort control', () => {
  const TITLES: Record<string, string> = {
    'track-1': 'Blue In Green',
    'track-2': 'Naima',
    'track-3': 'Flamenco Sketches'
  };

  it('saves the chosen order and draws the list in it', async () => {
    const bodies: unknown[] = [];
    let order = ['track-1', 'track-2', 'track-3'];

    server.use(
      http.patch(
        mockUrl(endpoints.sortPlaylist, { playlistId: PLAYLIST_ID }),
        async ({ request }) => {
          const body = SortPlaylistInputSchema.parse(await request.json());
          bodies.push(body);
          order = ['track-3', 'track-2', 'track-1'];

          return HttpResponse.json({ ...playlistJson(true), sort: body.sort });
        }
      ),
      http.get(
        mockUrl(endpoints.playlistTracks, { playlistId: PLAYLIST_ID }),
        () => {
          const items = order.map((id, index) =>
            trackJson(id, TITLES[id] ?? id, index)
          );

          return HttpResponse.json({
            items,
            total: items.length,
            limit: 50,
            offset: 0,
            counts: countsOf(items)
          });
        }
      )
    );

    renderDetail();
    await screen.findByRole('button', { name: 'Play Blue In Green' });

    fireEvent.click(
      screen.getByRole('button', { name: 'Sort by: Playlist order' })
    );
    fireEvent.click(screen.getByRole('option', { name: 'Oldest first' }));

    await waitFor(() => expect(bodies).toEqual([{ sort: 'oldest_first' }]));
    await waitFor(() =>
      expect(listTitles()).toEqual([
        'Flamenco Sketches',
        'Naima',
        'Blue In Green'
      ])
    );
  });
});

/*
 * A chip narrows the list and the rail; the identity card keeps stating the
 * playlist's own size, so no filter can make the playlist read as smaller. The
 * chips step aside under the shuffled queue.
 */
describe('PlaylistDetailPage filter chips', () => {
  function headerCard(container: HTMLElement): HTMLElement {
    const card = container.querySelector('[data-arrangement="card"]');

    if (!(card instanceof HTMLElement)) {
      throw new Error('the card header should be drawn');
    }

    return card;
  }

  it('draws the chips carrying the whole-playlist counts', async () => {
    renderDetail();

    await screen.findByRole('button', { name: 'Play Blue In Green' });

    expect(screen.getByRole('button', { name: 'All 3' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Stored 2' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pending 1' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Failed 0' })
    ).toBeInTheDocument();
  });

  it('narrows the list while the card keeps the playlist’s own size, and All restores the list', async () => {
    const { container } = renderDetail();

    await screen.findByRole('button', { name: 'Play Blue In Green' });

    fireEvent.click(screen.getByRole('button', { name: 'Stored 2' }));

    await waitFor(() =>
      expect(screen.queryByText('Flamenco Sketches')).not.toBeInTheDocument()
    );
    expect(listTitles()).toEqual(['Blue In Green', 'Naima']);
    /* The card is the playlist's identity, not the filtered view: the rail's
     * "All 3" and this figure are the same size. */
    expect(within(headerCard(container)).getByText('3')).toBeInTheDocument();
    expect(
      within(headerCard(container)).getByText('tracks')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All 3' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pending 1' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All 3' }));

    await waitFor(() =>
      expect(screen.getByText('Flamenco Sketches')).toBeInTheDocument()
    );
    expect(within(headerCard(container)).getByText('3')).toBeInTheDocument();
  });

  it('keeps the playlist’s own size under a filter that matches nothing', async () => {
    const { container } = renderDetail();

    await screen.findByRole('button', { name: 'Play Blue In Green' });

    fireEvent.click(screen.getByRole('button', { name: 'Failed 0' }));

    await screen.findByText('No failed tracks');

    /* An empty filter is not an empty playlist: "0 tracks" would claim it is. */
    expect(within(headerCard(container)).getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All 3' })).toBeInTheDocument();
  });

  it('draws the named empty state when a filter matches nothing, and Show all restores', async () => {
    renderDetail();

    await screen.findByRole('button', { name: 'Play Blue In Green' });

    fireEvent.click(screen.getByRole('button', { name: 'Failed 0' }));

    expect(await screen.findByText('No failed tracks')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));

    await waitFor(() =>
      expect(screen.getByText('Flamenco Sketches')).toBeInTheDocument()
    );
    expect(screen.queryByText('No failed tracks')).not.toBeInTheDocument();
  });

  it('retries every failed track from one counted control on the failed view', async () => {
    const all = [
      trackJson('failed-1', 'Failed One', 0, TrackFileStatus.Failed),
      trackJson('failed-2', 'Failed Two', 1, TrackFileStatus.Failed),
      trackJson('failed-3', 'Failed Three', 2, TrackFileStatus.Failed)
    ];
    const retried: string[] = [];
    let release = (): void => {};
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });

    server.use(
      http.get(mockUrl(endpoints.playlist, { playlistId: PLAYLIST_ID }), () =>
        HttpResponse.json({ ...playlistJson(true), trackCount: all.length })
      ),
      http.get(
        mockUrl(endpoints.playlistTracks, { playlistId: PLAYLIST_ID }),
        () =>
          HttpResponse.json({
            items: all,
            total: all.length,
            limit: 50,
            offset: 0,
            counts: countsOf(all)
          })
      ),
      http.post(mockUrl(endpoints.retryTrack), async ({ request }) => {
        const parts = new URL(request.url).pathname.split('/');
        retried.push(parts[parts.length - 2] ?? '');
        await gate;

        return HttpResponse.json({
          ...all[0].track,
          fileStatus: TrackFileStatus.Downloading
        });
      })
    );
    renderDetail();

    await screen.findByRole('button', { name: 'Failed 3' });
    /* The state block carries the action until the failed view has its own. */
    expect(
      screen.getByRole('button', { name: 'Retry all 3 failed tracks' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Failed 3' }));

    await screen.findByText('Failed One');
    const controls = screen.getAllByRole('button', {
      name: 'Retry all 3 failed tracks'
    });
    expect(controls).toHaveLength(1);

    fireEvent.click(controls[0]);

    expect(
      await screen.findByRole('button', {
        name: 'Retrying all 3 failed tracks...'
      })
    ).toBeDisabled();

    release();

    await waitFor(() => expect(retried).toHaveLength(3));
    expect(new Set(retried)).toEqual(
      new Set(all.map(association => association.track.id))
    );
  });

  /*
   * A filter changes what is seen, not what plays: the queue comes from the
   * whole-playlist read.
   */
  it('plays every playable track under a filter that matched nothing', async () => {
    renderDetail();

    await screen.findByRole('button', { name: 'Play Blue In Green' });

    fireEvent.click(screen.getByRole('button', { name: 'Failed 0' }));

    await screen.findByText('No failed tracks');

    fireEvent.click(screen.getByRole('button', { name: 'Play this playlist' }));

    await waitFor(() =>
      expect(usePlayerStore.getState().queue).toHaveLength(2)
    );
    expect(usePlayerStore.getState().queue.map(track => track.title)).toEqual([
      'Blue In Green',
      'Naima'
    ]);
  });
});
