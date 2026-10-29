import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlaylistTrack } from '@playliberty/contracts';
import {
  AssociationOrigin,
  FailureKind,
  Provider,
  TrackFileStatus,
  TrackSourceStatus,
  endpoints
} from '@playliberty/contracts';
import { cacheEffects } from '@playliberty/query';

import { EMPTY_COUNTS, mockUrl } from '../../../../testing/mocks/handlers';
import { server } from '../../../../testing/mocks/server';
import { coverCropQuery, useRetryFailedTracks } from './playlistClient';

const PLAYLIST = 'playlist-1';

function failedTrack(index: number): PlaylistTrack {
  const id = `failed-${index}`;

  return {
    track: {
      id,
      provider: Provider.Youtube,
      videoId: `video-${index}`,
      title: `Failed ${index}`,
      durationSeconds: 200,
      skipNonMusic: true,
      thumbnailPath: null,
      fileStatus: TrackFileStatus.Failed,
      sourceStatus: TrackSourceStatus.Available,
      failureKind: FailureKind.Unknown,
      failureReason: 'The download failed.',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T12:00:00.000Z'
    },
    origin: AssociationOrigin.Remote,
    position: index
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('coverCropQuery', () => {
  it('sends no field for the centered default', () => {
    expect(coverCropQuery(null)).toBeUndefined();
  });

  it('sends the four fractions of the visible square', () => {
    expect(
      coverCropQuery({ x: 1 / 3, y: 0, width: 1 / 3, height: 1 })?.toString()
    ).toBe(
      'cropX=0.333333&cropY=0.000000&cropWidth=0.333333&cropHeight=1.000000'
    );
  });
});

describe('useRetryFailedTracks', () => {
  it('pages through every failed track before retrying them', async () => {
    const all = Array.from({ length: 101 }, (_, index) => failedTrack(index));
    const retried: string[] = [];
    const trackChanged = vi.spyOn(cacheEffects, 'trackChanged');

    server.use(
      http.get(
        mockUrl(endpoints.playlistTracks, { playlistId: PLAYLIST }),
        ({ request }) => {
          const params = new URL(request.url).searchParams;
          const offset = Number(params.get('offset') ?? 0);
          const limit = Number(params.get('limit') ?? 100);

          return HttpResponse.json({
            items: all.slice(offset, offset + limit),
            total: all.length,
            limit,
            offset,
            counts: {
              ...EMPTY_COUNTS,
              [TrackFileStatus.Failed]: all.length
            }
          });
        }
      ),
      http.post(mockUrl(endpoints.retryTrack), ({ request }) => {
        const parts = new URL(request.url).pathname.split('/');
        retried.push(parts[parts.length - 2] ?? '');

        return HttpResponse.json({
          ...all[0].track,
          fileStatus: TrackFileStatus.Downloading
        });
      })
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useRetryFailedTracks(PLAYLIST), {
      wrapper
    });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBe(101);
    expect(retried).toHaveLength(101);
    expect(new Set(retried)).toEqual(
      new Set(all.map(association => association.track.id))
    );
    expect(trackChanged).toHaveBeenCalledWith(queryClient, [PLAYLIST]);
  });
});
