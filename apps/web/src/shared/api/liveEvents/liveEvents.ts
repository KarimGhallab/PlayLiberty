import type { QueryClient } from '@tanstack/react-query';

import { LiveEventType } from '@playliberty/contracts';
import type { LiveEvent } from '@playliberty/contracts';

import { cacheEffects } from '../cacheEffects/cacheEffects';

/*
 * What a live event invalidates. An event is a hint, never data: TanStack Query
 * stays the single owner of server state, and the keys live in `cacheEffects`.
 * `ready` on open invalidates everything, closing a reconnect's gap.
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
