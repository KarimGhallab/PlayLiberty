import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ProblemCode, endpoints } from '@playliberty/contracts';
import { cacheEffects } from '@playliberty/query';

import { ApiError } from '../apiClient/ApiClient';
import { apiClient } from '../client';

export interface SyncAllOutcome {
  readonly started: number;
  readonly alreadyRunning: number;
  /** The refusal that ended the loop, `null` when every playlist took it. */
  readonly stopped: unknown;
}

export type StartSync = (playlistId: string) => Promise<void>;

/* `409` is a fact about the set rather than a failure, so it is counted and the
 * loop goes on; any other refusal stops it, since repeating a fault for every
 * remaining playlist helps nobody. */
export async function runSyncAll(
  playlistIds: readonly string[],
  start: StartSync
): Promise<SyncAllOutcome> {
  let started = 0;
  let alreadyRunning = 0;

  for (const playlistId of playlistIds) {
    try {
      await start(playlistId);
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
}

/** Start the frozen set one at a time and read the gallery once when it ends. */
export function useSyncAllPlaylists() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistIds: readonly string[]) =>
      runSyncAll(playlistIds, playlistId =>
        apiClient.command(endpoints.syncPlaylist, { playlistId })
      ),
    onSettled: () => {
      cacheEffects.everyPlaylistChanged(queryClient);
    }
  });
}
