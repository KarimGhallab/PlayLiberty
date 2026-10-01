import { HttpResponse, http } from 'msw';

/*
 * The handlers the tests run against. The response is one valid playlist and a
 * page envelope, so a component test exercises the schema parsing as well as the
 * render.
 */
export const handlers = [
  http.get('http://localhost:3000/api/v1/playlists', () =>
    HttpResponse.json({
      items: [
        {
          id: 'playlist-1',
          ownerAccountId: 'account-1',
          name: 'Rain On The Window',
          coverUrl: null,
          provider: 'youtube',
          sourcePlaylistId: 'PL-demo',
          syncStatus: 'idle',
          lastSyncedAt: '2026-09-29T12:00:00.000Z',
          trackCount: 1,
          access: 'owner',
          hasShares: false,
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-29T12:00:00.000Z'
        }
      ],
      total: 1,
      limit: 50,
      offset: 0
    })
  )
];
