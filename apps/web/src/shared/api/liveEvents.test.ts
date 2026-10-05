import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { LiveEventType } from '@playliberty/contracts';

import { invalidateForLiveEvent } from './liveEvents';

function spyOnInvalidation() {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

  return { queryClient, invalidate };
}

/*
 * The mapping is the whole client half of the stream: an event names what
 * changed, and this decides which reads are asked again. It is pure, so it is
 * tested without a component and without a socket.
 */
describe('invalidateForLiveEvent', () => {
  it('invalidates every read when ready arrives', () => {
    const { queryClient, invalidate } = spyOnInvalidation();

    invalidateForLiveEvent(queryClient, { type: LiveEventType.Ready });

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith();
  });

  it('invalidates the library and the named playlist on a change', () => {
    const { queryClient, invalidate } = spyOnInvalidation();

    invalidateForLiveEvent(queryClient, {
      type: LiveEventType.PlaylistChanged,
      playlistId: 'playlist-1'
    });

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', 'playlist-1']
    });
  });
});
