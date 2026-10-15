import type { QueryClient } from '@tanstack/react-query';

import { LiveEventType } from '@playliberty/contracts';
import type { LiveEvent } from '@playliberty/contracts';

import { cacheEffects } from '../cacheEffects/cacheEffects';

/*
 * What a live event invalidates. An event is a hint and never data, so TanStack
 * Query stays the single owner of server state and no server value is copied into
 * a store. The keys live in `cacheEffects`, so an event and the mutation for the
 * same server fact cannot disagree.
 *
 * `ready` is sent when a connection opens, so invalidating everything on it
 * closes the gap after a reconnect: the tab re-reads whatever changed while it
 * was not listening, without a timer.
 */
export function invalidateForLiveEvent(
  queryClient: QueryClient,
  event: LiveEvent
): void {
  if (event.type === LiveEventType.Ready) {
    cacheEffects.everythingChanged(queryClient);
    return;
  }

  if (event.type === LiveEventType.PlaylistChanged) {
    cacheEffects.playlistChanged(queryClient, event.playlistId);
    return;
  }

  if (event.type === LiveEventType.PlaylistRemoved) {
    cacheEffects.playlistRemoved(queryClient, event.playlistId);
    return;
  }

  if (event.type === LiveEventType.TrackChanged) {
    cacheEffects.trackChanged(queryClient, event.playlistIds);
  }
}
