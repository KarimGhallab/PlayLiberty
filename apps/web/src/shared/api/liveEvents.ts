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
  }
}
