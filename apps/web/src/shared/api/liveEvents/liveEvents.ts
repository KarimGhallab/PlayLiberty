import type { QueryClient } from '@tanstack/react-query';

import { LiveEventType } from '@playliberty/contracts';
import type { LiveEvent } from '@playliberty/contracts';

/*
 * What a live event invalidates. An event is a hint and never data: it names
 * what changed and the client refetches the reads it already owns, so TanStack
 * Query stays the single owner of server state and no server value is copied
 * onto the wire or into a store.
 *
 * `ready` is sent when a connection opens, so invalidating everything on it is
 * what closes the gap after a reconnect: the tab re-reads whatever changed while
 * it was not listening, without a timer.
 */
export function invalidateForLiveEvent(
  queryClient: QueryClient,
  event: LiveEvent
): void {
  if (event.type === LiveEventType.Ready) {
    void queryClient.invalidateQueries();
    return;
  }

  if (event.type === LiveEventType.PlaylistChanged) {
    void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    void queryClient.invalidateQueries({
      queryKey: ['playlist', event.playlistId]
    });
    return;
  }

  if (event.type === LiveEventType.PlaylistRemoved) {
    /*
     * Reset rather than remove: a detail open on the playlist has an active
     * observer, and removing its query leaves that observer with nothing to read.
     * A reset clears the cached data and refetches the active reads, so the open
     * detail reaches the gone state and the library drops the item.
     */
    void queryClient.resetQueries({ queryKey: ['playlist', event.playlistId] });
    void queryClient.invalidateQueries({ queryKey: ['playlists'] });
    return;
  }

  if (event.type === LiveEventType.TrackChanged) {
    for (const playlistId of event.playlistIds) {
      void queryClient.invalidateQueries({
        queryKey: ['playlist', playlistId]
      });
    }

    void queryClient.invalidateQueries({ queryKey: ['playlists'] });
  }
}
