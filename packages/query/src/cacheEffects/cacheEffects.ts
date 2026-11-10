import type { QueryClient } from '@tanstack/react-query';

import { libraryKey, playlistKey, playlistPrefix } from '../keys.js';

/*
 * One map from a domain fact to the reads it asks again, shared by a mutation
 * and live event so keys cannot drift. The one place a key is written:
 * `['playlist', id]` prefixes run, tracks and shares.
 */

export const cacheEffects = {
  /*
   * The library list alone: a new playlist arrives on the next read, and a
   * setting change writes the playlist's own cache from the response.
   */
  libraryChanged(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: libraryKey });
  },

  playlistChanged(queryClient: QueryClient, playlistId: string): void {
    void queryClient.invalidateQueries({
      queryKey: playlistKey(playlistId)
    });
    void queryClient.invalidateQueries({ queryKey: libraryKey });
  },

  trackChanged(queryClient: QueryClient, playlistIds: readonly string[]): void {
    for (const playlistId of playlistIds) {
      void queryClient.invalidateQueries({
        queryKey: playlistKey(playlistId)
      });
    }

    void queryClient.invalidateQueries({ queryKey: libraryKey });
  },

  /*
   * The batch add touches several playlists, so ask the library and every
   * playlist read rather than working out which ids took the track.
   */
  everyPlaylistChanged(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: playlistPrefix });
    void queryClient.invalidateQueries({ queryKey: libraryKey });
  },

  /*
   * A gone playlist: reset rather than remove, because an open detail is an
   * active observer a removed query would leave with nothing to read.
   */
  playlistRemoved(queryClient: QueryClient, playlistId: string): void {
    void queryClient.resetQueries({ queryKey: playlistKey(playlistId) });
    void queryClient.invalidateQueries({ queryKey: libraryKey });
  },

  everythingChanged(queryClient: QueryClient): void {
    void queryClient.invalidateQueries();
  }
};
