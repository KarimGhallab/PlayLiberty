import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type {
  PlaylistTrack,
  TrackFileStatus,
  TrackFileStatusCounts
} from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import { playlistTracksKey } from '@playliberty/query';

import { apiClient } from './client';

const PAGE_SIZE = 100;

/* The next page starts where the loaded pages end, and stops at the total. */
export function nextTracksPageParam(lastPage: {
  readonly offset: number;
  readonly total: number;
  readonly items: readonly unknown[];
}): number | undefined {
  const loaded = lastPage.offset + lastPage.items.length;

  return loaded < lastPage.total ? loaded : undefined;
}

export interface PlaylistTracksRead {
  /* The loaded pages flattened into the one list the rows draw. */
  readonly items: readonly PlaylistTrack[];
  /* The whole-playlist counts, which only the first page carries. */
  readonly counts: TrackFileStatusCounts | undefined;
  readonly total: number | undefined;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly isSuccess: boolean;
  readonly isFetching: boolean;
  readonly isPlaceholderData: boolean;
  readonly error: Error | null;
  readonly hasMore: boolean;
  readonly isFetchingNextPage: boolean;
  readonly isFetchNextPageError: boolean;
  readonly fetchNextPage: () => void;
  readonly refetch: () => void;
}

/** The playlist's tracks, page by page; `null` disables the read. */
export function usePlaylistTracks(
  playlistId: string | null,
  state?: TrackFileStatus
): PlaylistTracksRead {
  const query = useInfiniteQuery({
    queryKey: playlistTracksKey(playlistId ?? '', state),
    queryFn: ({ pageParam }) => {
      if (playlistId === null) {
        throw new Error('A playlist tracks read needs an id.');
      }

      return apiClient.send(
        endpoints.playlistTracks,
        { playlistId },
        {},
        {
          limit: PAGE_SIZE,
          offset: pageParam,
          ...(state === undefined ? {} : { state })
        }
      );
    },
    initialPageParam: 0,
    getNextPageParam: nextTracksPageParam,
    placeholderData: keepPreviousData,
    enabled: playlistId !== null
  });
  const pages = query.data?.pages;
  const items = useMemo(
    () => pages?.flatMap(page => page.items) ?? [],
    [pages]
  );
  const firstPage = pages?.[0];
  const fetchNextPage = useCallback(() => {
    void query.fetchNextPage();
  }, [query.fetchNextPage]);
  const refetch = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  return {
    items,
    counts: firstPage?.counts,
    total: firstPage?.total,
    isPending: query.isPending,
    isError: query.isError,
    isSuccess: query.isSuccess,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    error: query.error,
    hasMore: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
    fetchNextPage,
    refetch
  };
}
