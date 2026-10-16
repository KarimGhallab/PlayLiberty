import { HttpResponse, http } from 'msw';

/*
 * The handlers the tests run against: two valid playlists, one owned and one
 * shared, in the route's order, so a component test also exercises schema
 * parsing, ordering and both access levels.
 */
/*
 * Two stored and one pending, so a test has a playable track and one that is
 * not yet playable to tell apart; the queue route returns them whole.
 */
const PLAYLIST_ONE_TRACKS = [
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
  },
  {
    track: {
      id: 'track-2',
      provider: 'youtube',
      videoId: 'video-2',
      title: 'Naima',
      durationSeconds: 273,
      skipNonMusic: true,
      thumbnailPath: null,
      fileStatus: 'stored',
      sourceStatus: 'available',
      failureReason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z'
    },
    origin: 'remote',
    position: 1
  },
  {
    track: {
      id: 'track-3',
      provider: 'youtube',
      videoId: 'video-3',
      title: 'Flamenco Sketches',
      durationSeconds: 565,
      skipNonMusic: true,
      thumbnailPath: null,
      fileStatus: 'pending',
      sourceStatus: 'available',
      failureReason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z'
    },
    origin: 'remote',
    position: 2
  }
];

/* Every state is a key including a zero, so the chips have one to draw. */
export const EMPTY_COUNTS = {
  stored: 0,
  pending: 0,
  downloading: 0,
  failed: 0,
  unavailable: 0
};

export function countsOf(
  tracks: readonly { readonly track: { readonly fileStatus: string } }[]
): Record<string, number> {
  const counts: Record<string, number> = { ...EMPTY_COUNTS };

  for (const association of tracks) {
    counts[association.track.fileStatus] =
      (counts[association.track.fileStatus] ?? 0) + 1;
  }

  return counts;
}

export const handlers = [
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
          trackCount: 1,
          skipNonMusic: true,
          sort: 'playlist',
          access: 'owner',
          hasShares: false,
          pinned: false,
          counts: { ...EMPTY_COUNTS, stored: 1 },
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-29T12:00:00.000Z'
        },
        {
          id: 'playlist-2',
          ownerAccountId: 'account-2',
          name: 'Shared Mix',
          coverTrackId: null,
          provider: 'youtube',
          sourcePlaylistId: 'PL-shared',
          syncStatus: 'idle',
          lastSyncedAt: '2026-09-28T12:00:00.000Z',
          trackCount: 4,
          skipNonMusic: true,
          sort: 'playlist',
          access: 'read',
          hasShares: false,
          pinned: false,
          counts: { ...EMPTY_COUNTS, stored: 4 },
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-28T12:00:00.000Z'
        }
      ],
      total: 2,
      limit: 50,
      offset: 0
    })
  ),
  /*
   * Both owners are present: the shared item resolves to Ada, and the owned
   * item's owner resolves but is never drawn, the header's own rule.
   */
  http.get('http://localhost:3000/api/v1/accounts', () =>
    HttpResponse.json({
      items: [
        { id: 'account-1', displayName: 'You', avatarUrl: null },
        { id: 'account-2', displayName: 'Ada', avatarUrl: null }
      ],
      total: 2,
      limit: 50,
      offset: 0
    })
  ),
  /* The reader, which the share picker uses to leave the reader's own row out. */
  http.get('http://localhost:3000/api/v1/me', () =>
    HttpResponse.json({ id: 'account-1', displayName: 'You', avatarUrl: null })
  ),
  http.get('http://localhost:3000/api/v1/playlists/playlist-1/shares', () =>
    HttpResponse.json([])
  ),
  http.post('http://localhost:3000/api/v1/playlists/playlist-1/shares', () =>
    HttpResponse.json({
      accountId: 'account-2',
      account: {
        id: 'account-2',
        displayName: 'Ada',
        avatarUrl: null
      },
      level: 'read',
      createdAt: '2026-09-29T12:00:00.000Z'
    })
  ),
  http.delete(
    'http://localhost:3000/api/v1/playlists/playlist-1/shares/:accountId',
    () => new HttpResponse(null, { status: 204 })
  ),
  /*
   * The same row as the first list item, so a test can tell the two reads apart
   * by their keys while the data stays consistent.
   */
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
      access: 'owner',
      hasShares: false,
      pinned: false,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z'
    })
  ),
  /* Completed, so the detail draws the summary rather than the error. */
  http.get(
    'http://localhost:3000/api/v1/playlists/playlist-1/sync-runs/latest',
    () =>
      HttpResponse.json({
        id: 'run-1',
        playlistId: 'playlist-1',
        status: 'completed',
        addedCount: 3,
        retainedCount: 128,
        removedCount: 1,
        failedCount: 2,
        startedAt: '2026-09-29T11:59:00.000Z',
        finishedAt: '2026-09-29T12:00:00.000Z',
        error: null
      })
  ),
  /*
   * `state` narrows the page and its total while the counts stay whole; the
   * queue route answers every status, because the client builds and filters it.
   */
  http.get(
    'http://localhost:3000/api/v1/playlists/playlist-1/tracks',
    ({ request }) => {
      const state = new URL(request.url).searchParams.get('state');
      const items =
        state === null
          ? PLAYLIST_ONE_TRACKS
          : PLAYLIST_ONE_TRACKS.filter(
              association => association.track.fileStatus === state
            );

      return HttpResponse.json({
        items,
        total: items.length,
        limit: 50,
        offset: 0,
        counts: countsOf(PLAYLIST_ONE_TRACKS)
      });
    }
  ),
  http.get('http://localhost:3000/api/v1/playlists/playlist-1/queue', () =>
    HttpResponse.json({ items: PLAYLIST_ONE_TRACKS })
  ),
  /*
   * The retry returns the track now downloading, the route's own shape; the
   * remove is a `204` with no body.
   */
  http.post('http://localhost:3000/api/v1/tracks/:trackId/retry', () =>
    HttpResponse.json({
      id: 'track-3',
      provider: 'youtube',
      videoId: 'video-3',
      title: 'Flamenco Sketches',
      durationSeconds: 565,
      skipNonMusic: true,
      thumbnailPath: null,
      fileStatus: 'downloading',
      sourceStatus: 'available',
      failureReason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z'
    })
  ),
  http.post('http://localhost:3000/api/v1/tracks/:trackId/fetch-whole', () =>
    HttpResponse.json({
      id: 'track-3',
      provider: 'youtube',
      videoId: 'video-3',
      title: 'Flamenco Sketches',
      durationSeconds: 565,
      skipNonMusic: false,
      thumbnailPath: null,
      fileStatus: 'pending',
      sourceStatus: 'available',
      failureReason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z'
    })
  ),
  http.delete(
    'http://localhost:3000/api/v1/playlists/:playlistId/tracks/:trackId',
    () => new HttpResponse(null, { status: 204 })
  ),
  http.patch('http://localhost:3000/api/v1/playlists/playlist-1', () =>
    HttpResponse.json({
      id: 'playlist-1',
      ownerAccountId: 'account-1',
      name: 'Renamed',
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
      pinned: false,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z'
    })
  ),
  /* Echoes the sent value, so a test reads the optimistic result back. */
  http.patch(
    'http://localhost:3000/api/v1/playlists/playlist-1/skip-non-music',
    async ({ request }) => {
      const body = (await request.json()) as { skipNonMusic: boolean };

      return HttpResponse.json({
        id: 'playlist-1',
        ownerAccountId: 'account-1',
        name: 'Rain On The Window',
        coverTrackId: null,
        provider: 'youtube',
        sourcePlaylistId: 'PL-demo',
        syncStatus: 'idle',
        lastSyncedAt: '2026-09-29T12:00:00.000Z',
        trackCount: 3,
        skipNonMusic: body.skipNonMusic,
        sort: 'playlist',
        access: 'owner',
        hasShares: false,
        pinned: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-29T12:00:00.000Z'
      });
    }
  ),
  http.patch(
    'http://localhost:3000/api/v1/playlists/playlist-1/sort',
    async ({ request }) => {
      const body = (await request.json()) as { sort: string };

      return HttpResponse.json({
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
        sort: body.sort,
        access: 'owner',
        hasShares: false,
        pinned: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-29T12:00:00.000Z'
      });
    }
  ),
  http.patch(
    'http://localhost:3000/api/v1/playlists/playlist-1/pin',
    async ({ request }) => {
      const body = (await request.json()) as { pinned: boolean };

      return HttpResponse.json({
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
        pinned: body.pinned,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-29T12:00:00.000Z'
      });
    }
  ),
  /*
   * One outcome per chosen playlist; the default says the first took it, and a
   * test needing a refusal overrides it.
   */
  http.post('http://localhost:3000/api/v1/tracks', () =>
    HttpResponse.json({
      results: [{ playlistId: 'playlist-1', outcome: 'added' }]
    })
  ),
  /* Creating a playlist answers the run it started, as the route does. */
  http.post('http://localhost:3000/api/v1/playlists', () =>
    HttpResponse.json(
      {
        id: 'run-created',
        playlistId: 'playlist-created',
        status: 'running',
        addedCount: 0,
        retainedCount: 0,
        removedCount: 0,
        failedCount: 0,
        startedAt: '2026-09-29T12:00:00.000Z',
        finishedAt: null,
        error: null
      },
      { status: 202 }
    )
  ),
  http.post('http://localhost:3000/api/v1/playlists/playlist-1/sync', () =>
    HttpResponse.json(
      {
        id: 'run-sync',
        playlistId: 'playlist-1',
        status: 'running',
        addedCount: 0,
        retainedCount: 0,
        removedCount: 0,
        failedCount: 0,
        startedAt: '2026-09-29T12:00:00.000Z',
        finishedAt: null,
        error: null
      },
      { status: 202 }
    )
  ),
  http.delete(
    'http://localhost:3000/api/v1/playlists/playlist-1',
    () => new HttpResponse(null, { status: 204 })
  )
];
