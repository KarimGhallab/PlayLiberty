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
  Account,
  AccountSummary,
  AddTrackResult,
  EgressRead,
  Playlist,
  PlaylistPage,
  PlaylistTrack,
  PlaylistTracksPage,
  Share,
  ShareLevel,
  SyncRun,
  Track
} from '@playliberty/contracts';
import {
  PlaylistSort,
  ProblemCode,
  TrackFileStatus,
  endpoints
} from '@playliberty/contracts';

import type { CoverCrop } from '../../coverCrop/coverCrop';
import { cacheEffects } from '../cacheEffects/cacheEffects';
import { ApiError } from '../client/client';
import {
  commandEndpoint,
  deleteEndpoint,
  patchEndpoint,
  postEndpoint,
  readEndpoint,
  uploadEndpoint
} from '../endpoints/endpoints';

export function usePlaylists(): UseQueryResult<PlaylistPage, Error> {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: () => readEndpoint(endpoints.playlists)
  });
}

/* The only source of another account's display name: a shared item carries an
 * `ownerAccountId` only, and an owner past the first page is a miss. */
export function useAccountDirectory(): UseQueryResult<AccountSummary[], Error> {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => readEndpoint(endpoints.accounts),
    select: page => page.items
  });
}

/* The only read that names the reader; the share picker omits its row, and
 * sharing with oneself is a route refusal. */
export function useCurrentAccount(): UseQueryResult<Account, Error> {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => readEndpoint(endpoints.currentAccount)
  });
}

/* The operator's pool: an admin-only read, so a 404 here is the gate, not a
 * fault. */
export function useEgress(): UseQueryResult<EgressRead, Error> {
  return useQuery({
    queryKey: ['egress'],
    queryFn: () => readEndpoint(endpoints.egress)
  });
}

/* A probe answers the whole read, so the page updates in one response. */
export function useProbeEgress(): UseMutationResult<EgressRead, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      postEndpoint(endpoints.probeEgress, {}, { name }),
    onSuccess: read => {
      queryClient.setQueryData(['egress'], read);
    }
  });
}

/* The operator's override: the switch answers the whole read, like a probe. */
export function useSwitchEgress(): UseMutationResult<
  EgressRead,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      commandEndpoint(endpoints.switchEgress, { name }),
    onSuccess: read => {
      queryClient.setQueryData(['egress'], read);
    }
  });
}

/*
 * The name an owner id resolves to, or null when absent. Null is a real answer
 * and must not be confused with an empty string, which renders a blank line.
 */
export function ownerNameFrom(
  directory: AccountSummary[],
  ownerAccountId: string
): string | null {
  return (
    directory.find(account => account.id === ownerAccountId)?.displayName ??
    null
  );
}

/*
 * A `202` with the started `SyncRun`; the playlist arrives on the next read,
 * `syncing`. No optimistic row; a refusal is the caller's to show.
 */
export function useCreatePlaylist(): UseMutationResult<
  SyncRun,
  Error,
  { url: string; skipNonMusic: boolean }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { url: string; skipNonMusic: boolean }) =>
      postEndpoint(endpoints.createPlaylist, input),
    onSuccess: () => {
      cacheEffects.libraryChanged(queryClient);
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

/*
 * The id scopes invalidation to one playlist; the filter caches each state
 * under its own read, which a playlist-prefix invalidation still catches.
 */
export function playlistTracksKey(playlistId: string, state?: TrackFileStatus) {
  return ['playlist', playlistId, 'tracks', state ?? 'all'] as const;
}

/*
 * The playlist's whole association list, what a queue is built from. Separate
 * from the tracks key: this is every association in one response.
 */
export function playlistQueueKey(playlistId: string) {
  return ['playlist', playlistId, 'queue'] as const;
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

/*
 * The playlist's name, separate from the tracks read because the name belongs
 * to the playlist. `null` disables it, the tab title's case at home.
 */
export function usePlaylist(
  playlistId: string | null
): UseQueryResult<Playlist, Error> {
  return useQuery({
    queryKey: ['playlist', playlistId],
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
    queryKey: ['playlist', playlistId, 'sync-runs', 'latest'],
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

export interface SyncAllOutcome {
  readonly started: number;
  readonly alreadyRunning: number;
  /** The refusal that ended the loop, `null` when every playlist took it. */
  readonly stopped: unknown;
}

/*
 * Start every playlist in the frozen set, one at a time. `409` is a fact about
 * the set rather than a failure, so it is counted and the loop goes on; any
 * other refusal stops it, since repeating a fault for every remaining playlist
 * helps nobody.
 */
export function useSyncAllPlaylists(): UseMutationResult<
  SyncAllOutcome,
  Error,
  readonly string[]
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playlistIds: readonly string[]) => {
      let started = 0;
      let alreadyRunning = 0;

      for (const playlistId of playlistIds) {
        try {
          await commandEndpoint(endpoints.syncPlaylist, { playlistId });
          started += 1;
        } catch (error) {
          if (
            error instanceof ApiError &&
            error.problem?.code === ProblemCode.SyncAlreadyRunning
          ) {
            alreadyRunning += 1;
            continue;
          }

          return { started, alreadyRunning, stopped: error };
        }
      }

      return { started, alreadyRunning, stopped: null };
    },
    /* One invalidation for the batch: the settle events arrive per playlist. */
    onSettled: () => {
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
      queryClient.setQueryData(['playlist', playlistId], playlist);
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
      queryClient.setQueryData<Playlist>(['playlist', playlistId], previous =>
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
  const key = ['playlist', playlistId];

  return useMutation({
    mutationFn: (skipNonMusic: boolean) =>
      patchEndpoint(endpoints.skipNonMusic, { skipNonMusic }, { playlistId }),
    onMutate: async (skipNonMusic: boolean) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Playlist>(key);

      if (previous !== undefined) {
        queryClient.setQueryData<Playlist>(key, { ...previous, skipNonMusic });
      }

      return { previous };
    },
    onError: (_error, _skipNonMusic, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: playlist => {
      queryClient.setQueryData(key, playlist);
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
  const key = ['playlist', playlistId];

  return useMutation({
    mutationFn: (sort: PlaylistSort) =>
      patchEndpoint(endpoints.sortPlaylist, { sort }, { playlistId }),
    onMutate: async (sort: PlaylistSort) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Playlist>(key);

      if (previous !== undefined) {
        queryClient.setQueryData<Playlist>(key, { ...previous, sort });
      }

      return { previous };
    },
    onError: (_error, _sort, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: playlist => {
      queryClient.setQueryData(key, playlist);
      cacheEffects.playlistChanged(queryClient, playlistId);
    }
  });
}

/*
 * Pin flips the flag on the cached library page, which regroups: grouping is
 * the client's part, the server owns order, and no event carries it.
 */
export interface PinPlaylistVariables {
  readonly playlistId: string;
  readonly pinned: boolean;
}

export function useUpdatePin(): UseMutationResult<
  Playlist,
  Error,
  PinPlaylistVariables
> {
  const queryClient = useQueryClient();
  const key = ['playlists'];

  return useMutation({
    mutationFn: ({ playlistId, pinned }: PinPlaylistVariables) =>
      patchEndpoint(endpoints.pinPlaylist, { pinned }, { playlistId }),
    onMutate: async ({ playlistId, pinned }: PinPlaylistVariables) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PlaylistPage>(key);

      if (previous !== undefined) {
        queryClient.setQueryData<PlaylistPage>(key, {
          ...previous,
          items: previous.items.map(item =>
            item.id === playlistId ? { ...item, pinned } : item
          )
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: () => {
      cacheEffects.libraryChanged(queryClient);
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
    queryKey: ['playlist', playlistId, 'shares'],
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
