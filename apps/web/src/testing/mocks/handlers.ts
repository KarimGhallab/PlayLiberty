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
        },
        {
          id: 'playlist-2',
          ownerAccountId: 'account-2',
          name: 'Shared Mix',
          coverUrl: null,
          provider: 'youtube',
          sourcePlaylistId: 'PL-shared',
          syncStatus: 'idle',
          lastSyncedAt: '2026-09-28T12:00:00.000Z',
          trackCount: 4,
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
  )
];
