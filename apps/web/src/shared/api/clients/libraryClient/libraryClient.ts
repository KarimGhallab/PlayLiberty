import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Playlist, PlaylistPage, SyncRun } from '@playliberty/contracts';
import { ProblemCode, endpoints } from '@playliberty/contracts';
import { cacheEffects, libraryKey } from '@playliberty/query';

import {
  commandEndpoint,
  patchEndpoint,
  postEndpoint,
  readEndpoint
} from '../../endpoints/endpoints';
import {
  optimisticPatch,
  restoreOptimistic
} from '../../optimisticPatch/optimisticPatch';
import { ApiError } from '../apiClient/apiClient';

/*
 * The library client: the gallery read, create, Sync all and the pin. A
 * playlist's own reads and actions live in `playlistClient`.
 */

export function usePlaylists(): UseQueryResult<PlaylistPage, Error> {
  return useQuery({
    queryKey: libraryKey,
    queryFn: () => readEndpoint(endpoints.playlists)
  });
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

  return useMutation({
    mutationFn: ({ playlistId, pinned }: PinPlaylistVariables) =>
      patchEndpoint(endpoints.pinPlaylist, { pinned }, { playlistId }),
    onMutate: ({ playlistId, pinned }: PinPlaylistVariables) =>
      optimisticPatch<PlaylistPage>(queryClient, libraryKey, previous => ({
        ...previous,
        items: previous.items.map(item =>
          item.id === playlistId ? { ...item, pinned } : item
        )
      })),
    onError: (_error, _variables, context) => {
      restoreOptimistic(queryClient, libraryKey, context);
    },
    onSuccess: () => {
      cacheEffects.libraryChanged(queryClient);
    }
  });
}
