import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProblemCode, endpoints } from '@playliberty/contracts';

import { mockUrl, problemResponse } from '../../../testing/mocks/handlers';
import { server } from '../../../testing/mocks/server';
import { cacheEffects } from '../cacheEffects/cacheEffects';
import { useSyncAllPlaylists } from './queries';

const RUNNING_RUN = {
  id: 'run-1',
  playlistId: 'playlist-1',
  status: 'running',
  addedCount: 0,
  retainedCount: 0,
  removedCount: 0,
  failedCount: 0,
  startedAt: '2026-10-21T12:00:00.000Z',
  finishedAt: null,
  error: null
};

afterEach(() => {
  vi.restoreAllMocks();
});

/* A harness that records each sync route's playlist id in arrival order. */
function syncRoute(answer: (playlistId: string) => Response) {
  const pressed: string[] = [];

  server.use(
    http.post(mockUrl(endpoints.syncPlaylist), ({ request }) => {
      const parts = new URL(request.url).pathname.split('/');
      const playlistId = parts[parts.length - 2] ?? '';
      pressed.push(playlistId);

      return answer(playlistId);
    })
  );

  return { pressed };
}

function renderSyncAll() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return {
    queryClient,
    ...renderHook(() => useSyncAllPlaylists(), { wrapper })
  };
}

describe('useSyncAllPlaylists', () => {
  it('starts the set in order and reads the library once when it settles', async () => {
    const route = syncRoute(() =>
      HttpResponse.json(RUNNING_RUN, { status: 202 })
    );
    const everyPlaylistChanged = vi.spyOn(cacheEffects, 'everyPlaylistChanged');
    const { result, queryClient } = renderSyncAll();

    await act(async () => {
      result.current.mutate(['playlist-1', 'playlist-2', 'playlist-3']);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(route.pressed).toEqual(['playlist-1', 'playlist-2', 'playlist-3']);
    expect(result.current.data).toEqual({
      started: 3,
      alreadyRunning: 0,
      stopped: null
    });
    expect(everyPlaylistChanged).toHaveBeenCalledTimes(1);
    expect(everyPlaylistChanged).toHaveBeenCalledWith(queryClient);
  });

  it('counts a playlist already running and carries on', async () => {
    const route = syncRoute(playlistId =>
      playlistId === 'playlist-2'
        ? problemResponse({
            code: ProblemCode.SyncAlreadyRunning,
            status: 409,
            title: 'Sync Already Running'
          })
        : HttpResponse.json(RUNNING_RUN, { status: 202 })
    );
    const { result } = renderSyncAll();

    await act(async () => {
      result.current.mutate(['playlist-1', 'playlist-2', 'playlist-3']);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(route.pressed).toEqual(['playlist-1', 'playlist-2', 'playlist-3']);
    expect(result.current.data).toEqual({
      started: 2,
      alreadyRunning: 1,
      stopped: null
    });
  });

  it('stops at the first refusal that is not a run already going', async () => {
    const route = syncRoute(playlistId =>
      playlistId === 'playlist-1'
        ? problemResponse({
            code: ProblemCode.InternalError,
            status: 500,
            title: 'Internal Server Error'
          })
        : HttpResponse.json(RUNNING_RUN, { status: 202 })
    );
    const { result } = renderSyncAll();

    await act(async () => {
      result.current.mutate(['playlist-1', 'playlist-2', 'playlist-3']);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(route.pressed).toEqual(['playlist-1']);
    expect(result.current.data).toMatchObject({
      started: 0,
      alreadyRunning: 0
    });
    expect(result.current.data?.stopped).toBeInstanceOf(Error);
  });
});
