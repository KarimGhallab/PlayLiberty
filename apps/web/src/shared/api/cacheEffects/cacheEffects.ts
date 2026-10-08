import type { QueryClient } from '@tanstack/react-query';

/*
 * The one map from a domain fact to the reads it asks again. A mutation and a
 * live event both name the same fact here, so the keys and the primitive cannot
 * drift between the two paths: the delete and the removal event share one
 * `playlistRemoved`, which resets the playlist's reads and refreshes the library,
 * rather than one path removing the query and the other resetting it.
 *
 * A key is written here and nowhere else. `['playlist', id]` is a prefix that
 * carries the playlist, its run, its tracks and its shares, so a playlist-scoped
 * fact asks all of them again; the library list is `['playlists']` and travels
 * with almost every fact because the list carries every playlist's counts.
 */

export const cacheEffects = {
  /*
   * The library list alone. A new playlist arrives on the next list read, and a
   * setting change is written to the playlist's own cache from the response, so
   * neither has a playlist read to ask again.
   */
  libraryChanged(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: ['playlists'] });
  },

  /* One playlist and every read under it: its run, its tracks and its shares. */
  playlistChanged(queryClient: QueryClient, playlistId: string): void {
    void queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
    void queryClient.invalidateQueries({ queryKey: ['playlists'] });
  },

  /* A track change in one or more playlists, so each named playlist is asked. */
  trackChanged(queryClient: QueryClient, playlistIds: readonly string[]): void {
    for (const playlistId of playlistIds) {
      void queryClient.invalidateQueries({
        queryKey: ['playlist', playlistId]
      });
    }

    void queryClient.invalidateQueries({ queryKey: ['playlists'] });
  },

  /*
   * Every playlist read. The batch add touches several playlists and answers an
   * outcome per id, so the library and every playlist read are asked again
   * rather than the mutation working out which ids took the track.
   */
  everyPlaylistChanged(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: ['playlist'] });
    void queryClient.invalidateQueries({ queryKey: ['playlists'] });
  },

  /*
   * A playlist that is gone. Reset rather than remove: a detail open on the
   * playlist has an active observer, and removing its query leaves that observer
   * with nothing to read. A reset clears the cached data and refetches the active
   * reads, so the open detail reaches the gone state and the library drops the
   * item. The deleting client and the live-event path both take this one.
   */
  playlistRemoved(queryClient: QueryClient, playlistId: string): void {
    void queryClient.resetQueries({ queryKey: ['playlist', playlistId] });
    void queryClient.invalidateQueries({ queryKey: ['playlists'] });
  },

  /* Every read, on a reconnect or a re-established session. */
  everythingChanged(queryClient: QueryClient): void {
    void queryClient.invalidateQueries();
  }
};
