import { HttpResponse, http } from 'msw';

/*
 * The handlers the tests run against. The response is two valid playlists, one
 * owned and one shared, in the order the route returned them, so a component
 * test exercises the schema parsing, the ordering and the two access levels as
 * well as the render.
 */
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
          access: 'owner',
          hasShares: false,
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
          access: 'read',
          hasShares: false,
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
   * The account directory. Both owners are present, so the shared item resolves
   * to Ada and the owned item's owner resolves too but is never drawn, which is
   * the header's own rule rather than a gap in this fixture.
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
  /* The shares of the first playlist, which starts empty. */
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
   * The single playlist, which is where the detail reads its name. It is the same
   * row as the first list item, so a test can tell the two reads apart by their
   * keys while the data stays consistent.
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
      access: 'owner',
      hasShares: false,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z'
    })
  ),
  /*
   * The latest sync run of the first playlist. A completed run, so the detail's
   * left column draws the summary under the card rather than the error.
   */
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
   * The tracks of the first playlist, in the playlist's own order. Two stored and
   * one still pending, so a test has a playable track and a not-yet-playable one
   * to tell apart.
   */
  http.get('http://localhost:3000/api/v1/playlists/playlist-1/tracks', () =>
    HttpResponse.json({
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
      ],
      total: 3,
      limit: 50,
      offset: 0
    })
  ),
  /*
   * Retry and remove, so the row's action lane has a route to answer. The retry
   * returns the track, now downloading, which is the shape the route sends back;
   * the remove is a `204` with no body.
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
      access: 'owner',
      hasShares: false,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z'
    })
  ),
  /*
   * The skip-non-music write, which echoes the value it was sent so a test can
   * read the optimistic result back from the server.
   */
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
        access: 'owner',
        hasShares: false,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-29T12:00:00.000Z'
      });
    }
  ),
  /*
   * The batch add, one outcome per chosen playlist. The default fixture says the
   * first playlist took it; a test that needs a refusal overrides it per test.
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
  /* Starting a sync answers the run it started. */
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
  /* Deleting a playlist answers `204` with no body. */
  http.delete(
    'http://localhost:3000/api/v1/playlists/playlist-1',
    () => new HttpResponse(null, { status: 204 })
  )
];
