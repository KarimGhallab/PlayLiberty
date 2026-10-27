import type {
  QueryClient,
  UseMutationResult,
  UseQueryResult
} from '@tanstack/react-query';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type {
  AddTrackResult,
  Playlist,
  PlaylistTrack,
  PlaylistTracksPage,
  Share,
  ShareLevel,
  SyncRun,
  Track
} from '@playliberty/contracts';
import {
  PlaylistSort,
  TrackFileStatus,
  endpoints
} from '@playliberty/contracts';

import type { CoverCrop } from '../../../coverCrop/coverCrop';
import { cacheEffects } from '../../cacheEffects/cacheEffects';
import {
  commandEndpoint,
  deleteEndpoint,
  patchEndpoint,
  postEndpoint,
  readEndpoint,
  uploadEndpoint
} from '../../endpoints/endpoints';
import {
  optimisticPatch,
  restoreOptimistic
} from '../../optimisticPatch/optimisticPatch';
import { ApiError } from '../apiClient/apiClient';

/*
 * The Playlist client: one owner for a playlist's reads, actions and the keys
 * they use. A page names a hook, never a key, and the invalidation it triggers
 * is the one in `cacheEffects`.
 */

const playlistKey = (playlistId: string | null) =>
  ['playlist', playlistId] as const;

const playlistTracksKey = (playlistId: string, state?: TrackFileStatus) =>
  ['playlist', playlistId, 'tracks', state ?? 'all'] as const;

const playlistQueueKey = (playlistId: string) =>
  ['playlist', playlistId, 'queue'] as const;

const latestSyncRunKey = (playlistId: string) =>
  ['playlist', playlistId, 'sync-runs', 'latest'] as const;

const playlistSharesKey = (playlistId: string) =>
  ['playlist', playlistId, 'shares'] as const;

/*
 * The playlist's name, separate from the tracks read because the name belongs
 * to the playlist. `null` disables it, the tab title's case at home.
 */
export function usePlaylist(
  playlistId: string | null
): UseQueryResult<Playlist, Error> {
  return useQuery({
    queryKey: playlistKey(playlistId),
    queryFn: () => {
      if (playlistId === null) {
        throw new Error('A playlist read needs an id.');
      }

      return readEndpoint(endpoints.playlist, { playlistId });
    },
    enabled: playlistId !== null
  });
}

/*
 * The latest sync run, the only place a playlist's counts live. A `404` means
 * never synced and maps to `null`; any other status is an error.
 */
export function useLatestSyncRun(
  playlistId: string
): UseQueryResult<SyncRun | null, Error> {
  return useQuery({
    queryKey: latestSyncRunKey(playlistId),
    queryFn: async () => {
      try {
        return await readEndpoint(endpoints.latestSyncRun, { playlistId });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    }
  });
}

const PLAYLIST_TRACKS_PAGE_SIZE = 100;

async function fetchPlaylistTrackPage(
  playlistId: string,
  offset: number,
  state?: TrackFileStatus
): Promise<PlaylistTracksPage> {
  const query = new URLSearchParams({
    limit: String(PLAYLIST_TRACKS_PAGE_SIZE),
    offset: String(offset)
  });

  if (state !== undefined) {
    query.set('state', state);
  }

  return readEndpoint(endpoints.playlistTracks, { playlistId }, query);
}

function nextTracksPageParam(lastPage: PlaylistTracksPage): number | undefined {
  const loaded = lastPage.offset + lastPage.items.length;

  return loaded < lastPage.total ? loaded : undefined;
}

export interface PlaylistTracksRead {
  readonly tracks: PlaylistTracksPage['items'];
  readonly counts: PlaylistTracksPage['counts'] | undefined;
  readonly total: PlaylistTracksPage['total'] | undefined;
  readonly isPlaceholderData: boolean;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly isSuccess: boolean;
  readonly error: Error | null;
  readonly retrying: boolean;
  readonly retry: () => void;
  readonly hasMore: boolean;
  readonly loadingMore: boolean;
  readonly moreFailed: boolean;
  readonly loadMore: () => void;
}

export function usePlaylistTracks(
  playlistId: string,
  state?: TrackFileStatus
): PlaylistTracksRead {
  const query = useInfiniteQuery({
    queryKey: playlistTracksKey(playlistId, state),
    queryFn: ({ pageParam }) =>
      fetchPlaylistTrackPage(playlistId, pageParam, state),
    initialPageParam: 0,
    getNextPageParam: nextTracksPageParam,
    placeholderData: keepPreviousData
  });
  /*
   * Stable, because a sentinel observes it: a fresh callback would tear the
   * observer down and rebuild it every render of the list.
   */
  const loadMore = useCallback(
    () => void query.fetchNextPage(),
    [query.fetchNextPage]
  );

  const pages = query.data?.pages;
  /* Stable while the data is, so a caller that keys an effect or a memo on the
   * list does not see a new array on every render. */
  const tracks = useMemo(
    () => pages?.flatMap(page => page.items) ?? [],
    [pages]
  );
  const firstPage = pages?.[0];

  return {
    tracks,
    counts: firstPage?.counts,
    total: firstPage?.total,
    isPlaceholderData: query.isPlaceholderData,
    isPending: query.isPending,
    isError: query.isError,
    isSuccess: query.isSuccess,
    error: query.error,
    retrying: query.isFetching && !query.isFetchingNextPage,
    retry: () => void query.refetch(),
    hasMore: query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    moreFailed: query.isFetchNextPageError,
    loadMore
  };
}

/*
 * The queue's own read: one response, not a page walk, because a queue holds
 * every playable track. Lazy, so a press reads the cache and never waits.
 */
export async function fetchPlaylistQueue(
  playlistId: string
): Promise<PlaylistTrack[]> {
  const list = await readEndpoint(endpoints.playlistQueue, { playlistId });

  return list.items;
}

export function usePlaylistQueue(
  playlistId: string,
  enabled: boolean
): UseQueryResult<PlaylistTrack[], Error> {
  return useQuery({
    queryKey: playlistQueueKey(playlistId),
    queryFn: () => fetchPlaylistQueue(playlistId),
    enabled
  });
}

export function readPlaylistQueue(
  queryClient: QueryClient,
  playlistId: string
): Promise<PlaylistTrack[]> {
  return queryClient.query({
    queryKey: playlistQueueKey(playlistId),
    queryFn: () => fetchPlaylistQueue(playlistId)
  });
}

/* The transition cancels a queue read it timed out on; the key stays here. */
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
export function useSyncPlaylist(): UseMutationResult<SyncRun, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistId: string) =>
      commandEndpoint(endpoints.syncPlaylist, { playlistId }),
    onSuccess: (_run, playlistId) => {
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}

/*
 * One request, one outcome per playlist: a batch can be part added, part
 * present or refused, so both reads are invalidated after.
 */
export function useAddTrack(): UseMutationResult<
  AddTrackResult,
  Error,
  { url: string; playlistIds: string[] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { url: string; playlistIds: string[] }) =>
      postEndpoint(endpoints.addTrack, input),
    onSuccess: () => {
      cacheEffects.everyPlaylistChanged(queryClient);
    }
  });
}

export interface SetPlaylistCoverVariables {
  readonly playlistId: string;
  readonly file: File;
  readonly crop: CoverCrop | null;
}

/* The four fields travel together or not at all; six decimals keep the region
 * inside a pixel of what the dialog showed. */
export function coverCropQuery(
  crop: CoverCrop | null
): URLSearchParams | undefined {
  if (crop === null) {
    return undefined;
  }

  return new URLSearchParams({
    cropX: crop.x.toFixed(6),
    cropY: crop.y.toFixed(6),
    cropWidth: crop.width.toFixed(6),
    cropHeight: crop.height.toFixed(6)
  });
}

/* The image bytes stay whole; the server normalises them and answers the
 * playlist carrying its new cover version. */
export function useSetPlaylistCover(): UseMutationResult<
  Playlist,
  Error,
  SetPlaylistCoverVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, file, crop }: SetPlaylistCoverVariables) =>
      uploadEndpoint(
        endpoints.setPlaylistCover,
        file,
        file.type,
        { playlistId },
        coverCropQuery(crop)
      ),
    onSuccess: (playlist, { playlistId }) => {
      queryClient.setQueryData(playlistKey(playlistId), playlist);
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}

export function useRemovePlaylistCover(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistId: string) =>
      deleteEndpoint(endpoints.removePlaylistCover, { playlistId }),
    onSuccess: (_void, playlistId) => {
      queryClient.setQueryData<Playlist>(playlistKey(playlistId), previous =>
        previous === undefined
          ? undefined
          : { ...previous, coverUpdatedAt: null }
      );
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}

export interface RenamePlaylistVariables {
  readonly playlistId: string;
  readonly name: string;
}

/** Owner-only at the route; the menu gates it here. */
export function useRenamePlaylist(): UseMutationResult<
  Playlist,
  Error,
  RenamePlaylistVariables
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ playlistId, name }: RenamePlaylistVariables) =>
      patchEndpoint(endpoints.renamePlaylist, { name }, { playlistId }),
    onSuccess: (_playlist, { playlistId }) => {
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}

/*
 * The skip-non-music switch, written optimistically so it moves on the press.
 * Not retroactive: no track read moves, only the playlist and library.
 */
export function useUpdateSkipNonMusic(
  playlistId: string
): UseMutationResult<Playlist, Error, boolean> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skipNonMusic: boolean) =>
      patchEndpoint(endpoints.skipNonMusic, { skipNonMusic }, { playlistId }),
    onMutate: skipNonMusic =>
      optimisticPatch<Playlist>(
        queryClient,
        playlistKey(playlistId),
        previous => ({ ...previous, skipNonMusic })
      ),
    onError: (_error, _skipNonMusic, context) => {
      restoreOptimistic(queryClient, playlistKey(playlistId), context);
    },
    onSuccess: playlist => {
      queryClient.setQueryData(playlistKey(playlistId), playlist);
      cacheEffects.libraryChanged(queryClient);
    }
  });
}

/*
 * Saving the read order moves the track reads too: the list and queue are read
 * in it, so a playlist-scoped invalidation asks both again.
 */
export function useUpdateSort(
  playlistId: string
): UseMutationResult<Playlist, Error, PlaylistSort> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sort: PlaylistSort) =>
      patchEndpoint(endpoints.sortPlaylist, { sort }, { playlistId }),
    onMutate: sort =>
      optimisticPatch<Playlist>(
        queryClient,
        playlistKey(playlistId),
        previous => ({ ...previous, sort })
      ),
    onError: (_error, _sort, context) => {
      restoreOptimistic(queryClient, playlistKey(playlistId), context);
    },
    onSuccess: playlist => {
      queryClient.setQueryData(playlistKey(playlistId), playlist);
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}

/* Delete one playlist: `204`, nothing returned. The library is invalidated; the
 * caller owns leaving the route, which a component does not decide. */
export function useDeletePlaylist(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistId: string) =>
      deleteEndpoint(endpoints.deletePlaylist, { playlistId }),
    onSuccess: (_void, playlistId) => {
      cacheEffects.playlistRemoved(queryClient, playlistId);
    }
  });
}

/*
 * Retry a failed download: the track answers `downloading` and the tracks are
 * read again so the row catches up; the failed count moved too.
 */
export function useRetryTrack(
  playlistId: string
): UseMutationResult<Track, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) =>
      commandEndpoint(endpoints.retryTrack, { trackId }),
    onSuccess: () => {
      cacheEffects.trackChanged(queryClient, [playlistId]);
    }
  });
}

/*
 * Retry every failed track. The set can span pages, so the ids are gathered
 * before the loop; one invalidation follows, even after a refused press.
 */
export function useRetryFailedTracks(
  playlistId: string
): UseMutationResult<number, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const trackIds: string[] = [];
      let offset = 0;

      for (;;) {
        const page = await fetchPlaylistTrackPage(
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
        await commandEndpoint(endpoints.retryTrack, { trackId });
      }

      return trackIds.length;
    },
    onSettled: () => {
      cacheEffects.trackChanged(queryClient, [playlistId]);
    }
  });
}

/*
 * Re-fetch a fileless track whole: the route flips its recorded policy to full
 * length, returning it to `pending`, so the tracks and failed count are reread.
 */
export function useFetchTrackWhole(
  playlistId: string
): UseMutationResult<Track, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) =>
      commandEndpoint(endpoints.fetchTrackWhole, { trackId }),
    onSuccess: () => {
      cacheEffects.trackChanged(queryClient, [playlistId]);
    }
  });
}

/*
 * Remove one track: `204`. The server suppresses it so the next sync does not
 * re-add it; the count moved, so both reads are invalidated.
 */
export function useRemoveTrack(
  playlistId: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackId: string) =>
      deleteEndpoint(endpoints.removeTrack, { playlistId, trackId }),
    onSuccess: () => {
      cacheEffects.trackChanged(queryClient, [playlistId]);
    }
  });
}

/*
 * One playlist's shares, gated on `open` so the dialog asks only on screen. A
 * `404` stays an error: a playlist the account can share must be found.
 */
export function usePlaylistShares(
  playlistId: string,
  enabled: boolean
): UseQueryResult<Share[], Error> {
  return useQuery({
    queryKey: playlistSharesKey(playlistId),
    queryFn: () => readEndpoint(endpoints.playlistShares, { playlistId }),
    enabled
  });
}

/*
 * Grant a share: the shares read is invalidated so the list settles on the
 * server's answer, including a level change on an existing share.
 */
export function useGrantShare(
  playlistId: string
): UseMutationResult<Share, Error, { accountId: string; level: ShareLevel }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { accountId: string; level: ShareLevel }) =>
      postEndpoint(endpoints.grantShare, input, { playlistId }),
    onSuccess: () => {
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}

/** The route answers `204`, so there is nothing to return. */
export function useRevokeShare(
  playlistId: string
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) =>
      deleteEndpoint(endpoints.revokeShare, { playlistId, accountId }),
    onSuccess: () => {
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}
