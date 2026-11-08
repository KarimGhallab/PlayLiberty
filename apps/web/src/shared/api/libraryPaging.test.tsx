import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type {
  PlaylistPage,
  PlaylistWithCounts
} from '@playliberty/contracts';
import {
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  endpoints
} from '@playliberty/contracts';
import { usePlaylists } from '@playliberty/api-client';

import { mockUrl } from '../../testing/mocks/handlers';
import { server } from '../../testing/mocks/server';

function playlist(index: number): PlaylistWithCounts {
  return {
    id: `playlist-${index}`,
    ownerAccountId: 'account-1',
    name: `Playlist ${index}`,
    coverTrackId: null,
    coverUpdatedAt: null,
    provider: Provider.Youtube,
    sourcePlaylistId: `PL-${index}`,
    syncStatus: PlaylistSyncStatus.Idle,
    lastSyncedAt: null,
    trackCount: 0,
    skipNonMusic: true,
    sort: PlaylistSort.Playlist,
    access: 'owner',
    hasShares: false,
    pinned: false,
    counts: {
      stored: 0,
      pending: 0,
      downloading: 0,
      failed: 0,
      unavailable: 0
    },
    remoteRemoved: 0,
    createdAt: '2026-11-06T00:00:00.000Z',
    updatedAt: '2026-11-06T00:00:00.000Z'
  };
}

const ALL = Array.from({ length: 51 }, (_, index) => playlist(index));

function page(limit: number, offset: number): PlaylistPage {
  return {
    items: ALL.slice(offset, offset + limit),
    total: ALL.length,
    limit,
    offset
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false } }
        })
      }>
      {children}
    </QueryClientProvider>
  );
}

describe('the gallery read', () => {
  it('loads the second page and reports the server total', async () => {
    const asked: { limit: number; offset: number }[] = [];

    server.use(
      http.get(mockUrl(endpoints.playlists), ({ request }) => {
        const url = new URL(request.url);
        const limit = Number(url.searchParams.get('limit'));
        const offset = Number(url.searchParams.get('offset'));
        asked.push({ limit, offset });

        return HttpResponse.json(page(limit, offset));
      })
    );

    const { result } = renderHook(() => usePlaylists(), { wrapper });

    await waitFor(() => expect(result.current.data?.items).toHaveLength(50));
    expect(result.current.data?.total).toBe(51);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.items).toHaveLength(51));
    expect(asked).toEqual([
      { limit: 50, offset: 0 },
      { limit: 50, offset: 50 }
    ]);
  });
});
