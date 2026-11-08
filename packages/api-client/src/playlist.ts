import type { QueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type {
  AddTrackInput,
  AddTrackResult,
  Playlist,
  PlaylistTrack,
  PlaylistTrackList,
  PlaylistTracksPage,
  Share,
  ShareLevel,
  SyncRun,
  Track,
  TrackFileStatusCounts,
  TrackFilterState
} from '@playliberty/contracts';
import {
  PlaylistSort,
  TrackFileStatus,
  endpoints
} from '@playliberty/contracts';
import {
  cacheEffects,
  latestSyncRunKey,
  optimisticPatch,
  playlistKey,
  playlistQueueKey,
  playlistSharesKey,
  playlistTracksKey,
  restoreOptimistic
} from '@playliberty/query';
import type { OptimisticContext } from '@playliberty/query';
import type { CoverCrop } from '@playliberty/ui-foundation';

import { ApiError } from './apiError.js';
import { apiClient } from './configure.js';
import type { QueryParams } from './transport/transport.js';

export const PLAYLIST_TRACKS_PAGE_SIZE = 100;

/* The playlist's name, separate from the tracks read because the name belongs
 * to the playlist. `null` disables it, the tab title's case at home. */
export function playlistQueryOptions(playlistId: string | null) {
  return {
    queryKey: playlistKey(playlistId),
    queryFn: () => {
      if (playlistId === null) {
        throw new Error('A playlist read needs an id.');
      }

      return apiClient().send(endpoints.playlist, { playlistId });
    },
    enabled: playlistId !== null
  };
}

export function usePlaylist(
  playlistId: string | null
): UseQueryResult<Playlist, Error> {
  return useQuery(playlistQueryOptions(playlistId));
}

/* The latest sync run, the only place a playlist's counts live. A `404` means
 * never synced and maps to `null`; any other status is an error. */
export function latestSyncRunQueryOptions(playlistId: string | null) {
  return {
    queryKey: latestSyncRunKey(playlistId ?? ''),
    queryFn: async () => {
      if (playlistId === null) {
        throw new Error('A sync run read needs an id.');
      }

      try {
        return await apiClient().send(endpoints.latestSyncRun, { playlistId });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
    enabled: playlistId !== null
  };
}

export function useLatestSyncRun(
  playlistId: string | null
): UseQueryResult<SyncRun | null, Error> {
  return useQuery(latestSyncRunQueryOptions(playlistId));
}

/* The next page starts where the loaded pages end, and stops at the total. */
export function nextTracksPageParam(lastPage: {
  readonly offset: number;
  readonly total: number;
  readonly items: readonly unknown[];
}): number | undefined {
  const loaded = lastPage.offset + lastPage.items.length;

  return loaded < lastPage.total ? loaded : undefined;
}

export function fetchPlaylistPage(
  playlistId: string,
  offset: number,
  state?: TrackFilterState
): Promise<PlaylistTracksPage> {
  const query: QueryParams = {
    limit: PLAYLIST_TRACKS_PAGE_SIZE,
    offset,
    ...(state === undefined ? {} : { state })
  };

  return apiClient().send(endpoints.playlistTracks, { playlistId }, {}, query);
}

export function playlistTracksQueryOptions(
  playlistId: string | null,
  state?: TrackFilterState
) {
  return {
    queryKey: playlistTracksKey(playlistId ?? '', state),
    queryFn: ({ pageParam }: { pageParam: number }) => {
      if (playlistId === null) {
        throw new Error('A playlist tracks read needs an id.');
      }

      return fetchPlaylistPage(playlistId, pageParam, state);
    },
    initialPageParam: 0,
    getNextPageParam: nextTracksPageParam,
    placeholderData: keepPreviousData,
    enabled: playlistId !== null
  };
}

export interface PlaylistTracksRead {
  /* Both names while the two clients settle: `tracks` on web, `items` on
   * mobile. One array, so neither can drift. */
  readonly tracks: readonly PlaylistTrack[];
  readonly items: readonly PlaylistTrack[];
  /* The whole-playlist counts, which only the first page carries. */
  readonly counts: TrackFileStatusCounts | undefined;
  /* Stored tracks whose source removed them, beside the counts. */
  readonly remoteRemoved: number | undefined;
  readonly total: number | undefined;
  readonly isPlaceholderData: boolean;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly isSuccess: boolean;
  readonly isFetching: boolean;
  readonly error: Error | null;
  readonly retrying: boolean;
  readonly retry: () => void;
  readonly hasMore: boolean;
  readonly loadingMore: boolean;
  readonly moreFailed: boolean;
  readonly loadMore: () => void;
  readonly isFetchingNextPage: boolean;
  readonly isFetchNextPageError: boolean;
  readonly fetchNextPage: () => void;
  readonly refetch: () => void;
}

/** The playlist's tracks, page by page; `null` disables the read. */
export function usePlaylistTracks(
  playlistId: string | null,
  state?: TrackFilterState
): PlaylistTracksRead {
  const query = useInfiniteQuery(playlistTracksQueryOptions(playlistId, state));
  const pages = query.data?.pages;
  /* Stable while the data is, so a caller that keys an effect or a memo on the
   * list does not see a new array on every render. */
  const items = useMemo(
    () => pages?.flatMap(page => page.items) ?? [],
    [pages]
  );
  const firstPage = pages?.[0];
  const loadMore = useCallback(() => {
    void query.fetchNextPage();
  }, [query.fetchNextPage]);
  const retry = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);
  const fetchNextPage = useCallback(() => {
    void query.fetchNextPage();
  }, [query.fetchNextPage]);
  const refetch = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  return {
    tracks: items,
    items,
    counts: firstPage?.counts,
    remoteRemoved: firstPage?.remoteRemoved,
    total: firstPage?.total,
    isPlaceholderData: query.isPlaceholderData,
    isPending: query.isPending,
    isError: query.isError,
    isSuccess: query.isSuccess,
    isFetching: query.isFetching,
    error: query.error,
    retrying: query.isFetching && !query.isFetchingNextPage,
    retry,
    hasMore: query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    moreFailed: query.isFetchNextPageError,
    loadMore,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
    fetchNextPage,
    refetch
  };
}

/* The queue's own read: one response, not a page walk, because a queue holds
 * every playable track. The cached value is the route's shape, so the hook and
 * the player read the same list. */
export async function fetchPlaylistQueue(
  playlistId: string
): Promise<PlaylistTrackList> {
  return apiClient().send(endpoints.playlistQueue, { playlistId });
}

export function playlistQueueQueryOptions(
  playlistId: string | null,
  enabled = true
) {
  return {
    queryKey: playlistQueueKey(playlistId ?? ''),
    queryFn: () => {
      if (playlistId === null) {
        throw new Error('A playlist queue read needs an id.');
      }

      return apiClient().send(endpoints.playlistQueue, { playlistId });
    },
    enabled: playlistId !== null && enabled
  };
}

export function usePlaylistQueue(
  playlistId: string | null,
  enabled = true
): UseQueryResult<PlaylistTrackList, Error> {
  return useQuery(playlistQueueQueryOptions(playlistId, enabled));
}

export async function readPlaylistQueue(
  queryClient: QueryClient,
  playlistId: string
): Promise<PlaylistTrack[]> {
  const list = await queryClient.query({
    queryKey: playlistQueueKey(playlistId),
    queryFn: () => fetchPlaylistQueue(playlistId)
  });

  return list.items;
}

/* The transition cancels a queue read it timed out on; the key stays in
 * `@playliberty/query`. */
export function cancelPlaylistQueue(
  queryClient: QueryClient,
  playlistId: string
): Promise<void> {
  return queryClient.cancelQueries({
    queryKey: playlistQueueKey(playlistId),
    exact: true
  });
}

/*
 * Start a sync: the `202` run is `running` and completes later, so the playlist
 * is read again to draw the settled state on the next refetch.
 */
export function syncPlaylistOptions(queryClient: QueryClient) {
  return {
    mutationFn: (playlistId: string) =>
      apiClient().command(endpoints.syncPlaylist, { playlistId }),
    onSuccess: (_run: void, playlistId: string) => {
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  };
}

export function useSyncPlaylist(): UseMutationResult<void, Error, string> {
  return useMutation(syncPlaylistOptions(useQueryClient()));
}

/*
 * One request, one outcome per playlist: a batch can be part added, part
 * present or refused, so both reads are invalidated after.
 */
export function addTrackOptions(queryClient: QueryClient) {
  return {
    mutationFn: (input: AddTrackInput) =>
      apiClient().send(
        endpoints.addTrack,
        {},
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        }
      ),
    onSuccess: () => {
      cacheEffects.everyPlaylistChanged(queryClient);
    }
  };
}

export function useAddTrack(): UseMutationResult<
  AddTrackResult,
  Error,
  AddTrackInput
> {
  return useMutation(addTrackOptions(useQueryClient()));
}

export interface SetPlaylistCoverVariables {
  readonly playlistId: string;
  readonly file: Blob;
  readonly crop: CoverCrop | null;
  /* Native callers pass the type Expo reports; a web `File` carries its own. */
  readonly contentType?: string;
}

/* The four fields travel together or not at all; six decimals keep the region
 * inside a pixel of what the dialog showed. */
export function coverCropQuery(
  crop: CoverCrop | null
): QueryParams | undefined {
  if (crop === null) {
    return undefined;
  }

  return {
    cropX: crop.x.toFixed(6),
    cropY: crop.y.toFixed(6),
    cropWidth: crop.width.toFixed(6),
    cropHeight: crop.height.toFixed(6)
  };
}

/* The image bytes stay whole; the server normalises them and answers the
 * playlist carrying its new cover version. */
export function setPlaylistCoverOptions(queryClient: QueryClient) {
  return {
    mutationFn: ({
      playlistId,
      file,
      crop,
      contentType
    }: SetPlaylistCoverVariables) =>
      apiClient().send(
        endpoints.setPlaylistCover,
        { playlistId },
        {
          headers: { 'Content-Type': contentType ?? file.type },
          body: file
        },
        coverCropQuery(crop)
      ),
    onSuccess: (
      playlist: Playlist,
      { playlistId }: SetPlaylistCoverVariables
    ) => {
      queryClient.setQueryData(playlistKey(playlistId), playlist);
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  };
}

export function useSetPlaylistCover(): UseMutationResult<
  Playlist,
  Error,
  SetPlaylistCoverVariables
> {
  return useMutation(setPlaylistCoverOptions(useQueryClient()));
}

export function removePlaylistCoverOptions(queryClient: QueryClient) {
  return {
    mutationFn: (playlistId: string) =>
      apiClient().command(endpoints.removePlaylistCover, { playlistId }),
    onSuccess: (_void: void, playlistId: string) => {
      queryClient.setQueryData<Playlist>(playlistKey(playlistId), previous =>
        previous === undefined
          ? undefined
          : { ...previous, coverUpdatedAt: null }
      );
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  };
}

export function useRemovePlaylistCover(): UseMutationResult<
  void,
  Error,
  string
> {
  return useMutation(removePlaylistCoverOptions(useQueryClient()));
}

export interface RenamePlaylistVariables {
  readonly playlistId: string;
  readonly name: string;
}

export function renamePlaylistOptions(queryClient: QueryClient) {
  return {
    mutationFn: ({ playlistId, name }: RenamePlaylistVariables) =>
      apiClient().send(
        endpoints.renamePlaylist,
        { playlistId },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        }
      ),
    onSuccess: (
      _playlist: Playlist,
      { playlistId }: RenamePlaylistVariables
    ) => {
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  };
}

/** Owner-only at the route; the menu gates it here. */
export function useRenamePlaylist(): UseMutationResult<
  Playlist,
  Error,
  RenamePlaylistVariables
> {
  return useMutation(renamePlaylistOptions(useQueryClient()));
}

/* The switch moves on the press: the playlist cache carries the new value
 * until the write answers, and a refusal puts the saved one back. The setting
 * is not retroactive, so no track read is asked again. */
export function updateSkipNonMusicOptions(
  playlistId: string,
  queryClient: QueryClient
) {
  return {
    mutationFn: (skipNonMusic: boolean) =>
      apiClient().send(
        endpoints.skipNonMusic,
        { playlistId },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skipNonMusic })
        }
      ),
    onMutate: (skipNonMusic: boolean) =>
      optimisticPatch<Playlist>(
        queryClient,
        playlistKey(playlistId),
        previous => ({ ...previous, skipNonMusic })
      ),
    onError: (
      _error: unknown,
      _skipNonMusic: boolean,
      context: OptimisticContext<Playlist> | undefined
    ) => {
      restoreOptimistic(queryClient, playlistKey(playlistId), context);
    },
    onSuccess: (playlist: Playlist) => {
      queryClient.setQueryData(playlistKey(playlistId), playlist);
      cacheEffects.libraryChanged(queryClient);
    }
  };
}

export function useUpdateSkipNonMusic(playlistId: string) {
  return useMutation<Playlist, Error, boolean, OptimisticContext<Playlist>>(
    updateSkipNonMusicOptions(playlistId, useQueryClient())
  );
}

/* Saving the read order moves the list and the queue, so the playlist reads are
 * asked again. The press moves the saved value first, and a refusal puts it
 * back. */
export function updateSortOptions(
  playlistId: string,
  queryClient: QueryClient
) {
  return {
    mutationFn: (sort: PlaylistSort) =>
      apiClient().send(
        endpoints.sortPlaylist,
        { playlistId },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort })
        }
      ),
    onMutate: (sort: PlaylistSort) =>
      optimisticPatch<Playlist>(
        queryClient,
        playlistKey(playlistId),
        previous => ({ ...previous, sort })
      ),
    onError: (
      _error: unknown,
      _sort: PlaylistSort,
      context: OptimisticContext<Playlist> | undefined
    ) => {
      restoreOptimistic(queryClient, playlistKey(playlistId), context);
    },
    onSuccess: (playlist: Playlist) => {
      queryClient.setQueryData(playlistKey(playlistId), playlist);
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  };
}

export function useUpdateSort(playlistId: string) {
  return useMutation<
    Playlist,
    Error,
    PlaylistSort,
    OptimisticContext<Playlist>
  >(updateSortOptions(playlistId, useQueryClient()));
}

/* Delete one playlist: `204`, nothing returned. The library is invalidated; the
 * caller owns leaving the route, which a component does not decide. */
export function deletePlaylistOptions(queryClient: QueryClient) {
  return {
    mutationFn: (playlistId: string) =>
      apiClient().command(endpoints.deletePlaylist, { playlistId }),
    onSuccess: (_void: void, playlistId: string) => {
      cacheEffects.playlistRemoved(queryClient, playlistId);
    }
  };
}

export function useDeletePlaylist(): UseMutationResult<void, Error, string> {
  return useMutation(deletePlaylistOptions(useQueryClient()));
}

/*
 * Retry a failed download: the track answers `downloading` and the tracks are
 * read again so the row catches up; the failed count moved too.
 */
export function retryTrackOptions(
  playlistId: string,
  queryClient: QueryClient
) {
  return {
    mutationFn: (trackId: string) =>
      apiClient().send(endpoints.retryTrack, { trackId }),
    onSuccess: () => {
      cacheEffects.trackChanged(queryClient, [playlistId]);
    }
  };
}

export function useRetryTrack(
  playlistId: string
): UseMutationResult<Track, Error, string> {
  return useMutation(retryTrackOptions(playlistId, useQueryClient()));
}

/*
 * Retry every failed track. The set can span pages, so the ids are gathered
 * before the loop; one invalidation follows, even after a refused press.
 */
export function retryFailedTracksOptions(
  playlistId: string,
  queryClient: QueryClient
) {
  return {
    mutationFn: async () => {
      const trackIds: string[] = [];
      let offset = 0;

      for (;;) {
        const page = await fetchPlaylistPage(
          playlistId,
          offset,
          TrackFileStatus.Failed
        );

        trackIds.push(...page.items.map(association => association.track.id));
        offset += page.items.length;

        if (page.items.length === 0 || offset >= page.total) {
          break;
        }
      }

      for (const trackId of trackIds) {
        await apiClient().send(endpoints.retryTrack, { trackId });
      }

      return trackIds.length;
    },
    onSettled: () => {
      cacheEffects.trackChanged(queryClient, [playlistId]);
    }
  };
}

export function useRetryFailedTracks(
  playlistId: string
): UseMutationResult<number, Error, void> {
  return useMutation(retryFailedTracksOptions(playlistId, useQueryClient()));
}

/*
 * Re-fetch a fileless track whole: the route flips its recorded policy to full
 * length, returning it to `pending`, so the tracks and failed count are reread.
 */
export function fetchTrackWholeOptions(
  playlistId: string,
  queryClient: QueryClient
) {
  return {
    mutationFn: (trackId: string) =>
      apiClient().send(endpoints.fetchTrackWhole, { trackId }),
    onSuccess: () => {
      cacheEffects.trackChanged(queryClient, [playlistId]);
    }
  };
}

export function useFetchTrackWhole(
  playlistId: string
): UseMutationResult<Track, Error, string> {
  return useMutation(fetchTrackWholeOptions(playlistId, useQueryClient()));
}

/*
 * Remove one track: `204`. The server suppresses it so the next sync does not
 * re-add it; the count moved, so both reads are invalidated.
 */
export function removeTrackOptions(
  playlistId: string,
  queryClient: QueryClient
) {
  return {
    mutationFn: (trackId: string) =>
      apiClient().command(endpoints.removeTrack, { playlistId, trackId }),
    onSuccess: () => {
      cacheEffects.trackChanged(queryClient, [playlistId]);
    }
  };
}

export function useRemoveTrack(
  playlistId: string
): UseMutationResult<void, Error, string> {
  return useMutation(removeTrackOptions(playlistId, useQueryClient()));
}

/* One playlist's shares, gated on `enabled` so the dialog asks only on screen.
 * A `404` stays an error: a playlist the account can share must be found. */
export function playlistSharesQueryOptions(
  playlistId: string | null,
  enabled = true
) {
  return {
    queryKey: playlistSharesKey(playlistId ?? ''),
    queryFn: () => {
      if (playlistId === null) {
        throw new Error('A shares read needs an id.');
      }

      return apiClient().send(endpoints.playlistShares, { playlistId });
    },
    enabled: playlistId !== null && enabled
  };
}

export function usePlaylistShares(
  playlistId: string | null,
  enabled = true
): UseQueryResult<Share[], Error> {
  return useQuery(playlistSharesQueryOptions(playlistId, enabled));
}

export interface GrantShareVariables {
  readonly accountId: string;
  readonly level: ShareLevel;
}

/* Grant a share: the shares read is invalidated so the list settles on the
 * server's answer, including a level change on an existing share. */
export function grantShareOptions(
  playlistId: string | null,
  queryClient: QueryClient
) {
  return {
    mutationFn: async ({ accountId, level }: GrantShareVariables) => {
      if (playlistId === null) {
        throw new Error('A grant needs a playlist.');
      }

      return apiClient().send(
        endpoints.grantShare,
        { playlistId },
        {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, level })
        }
      );
    },
    onSuccess: () => {
      if (playlistId === null) {
        return;
      }

      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  };
}

export function useGrantShare(
  playlistId: string | null
): UseMutationResult<Share, Error, GrantShareVariables> {
  return useMutation(grantShareOptions(playlistId, useQueryClient()));
}

/** The route answers `204`, so there is nothing to return. */
export function revokeShareOptions(
  playlistId: string | null,
  queryClient: QueryClient
) {
  return {
    mutationFn: async (accountId: string) => {
      if (playlistId === null) {
        throw new Error('A revoke needs a playlist.');
      }

      await apiClient().command(endpoints.revokeShare, {
        playlistId,
        accountId
      });
    },
    onSuccess: () => {
      if (playlistId === null) {
        return;
      }

      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  };
}

export function useRevokeShare(
  playlistId: string | null
): UseMutationResult<void, Error, string> {
  return useMutation(revokeShareOptions(playlistId, useQueryClient()));
}
