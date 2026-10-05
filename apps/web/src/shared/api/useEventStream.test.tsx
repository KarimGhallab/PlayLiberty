import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LiveEventType } from '@playliberty/contracts';

import { createFakeEventStream } from '../../testing/fakeEventStream';
import { EventStreamContext, useEventStream } from './useEventStream';

/*
 * The hook is the tab's connection: it opens one stream, hands each frame to the
 * invalidation mapping, and closes on unmount. The socket is the factory's, so a
 * test injects a fake and emits the frames a server would send, which is the
 * behavior that matters here; the real wire is covered end to end.
 */

function Probe() {
  useEventStream();
  return null;
}

function renderStream() {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const eventStream = createFakeEventStream();

  const view = render(
    <QueryClientProvider client={queryClient}>
      <EventStreamContext.Provider value={eventStream.factory}>
        <Probe />
      </EventStreamContext.Provider>
    </QueryClientProvider>
  );

  return { invalidate, eventStream, view };
}

describe('useEventStream', () => {
  it('opens one connection for the tab at the events route', () => {
    const { eventStream } = renderStream();

    expect(eventStream.connectionCount()).toBe(1);
    expect(eventStream.urls).toEqual(['/api/v1/events']);
  });

  it('invalidates every read when ready arrives', () => {
    const { invalidate, eventStream } = renderStream();

    act(() => {
      eventStream.emit(JSON.stringify({ type: LiveEventType.Ready }));
    });

    expect(invalidate).toHaveBeenCalledWith();
  });

  it('invalidates the library and the named playlist on a change', () => {
    const { invalidate, eventStream } = renderStream();

    act(() => {
      eventStream.emit(
        JSON.stringify({
          type: LiveEventType.PlaylistChanged,
          playlistId: 'playlist-1'
        })
      );
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', 'playlist-1']
    });
  });

  it('ignores a frame that is not a live event', () => {
    const { invalidate, eventStream } = renderStream();

    act(() => {
      eventStream.emit('not json');
    });

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('closes the connection when the tab unmounts', () => {
    const { eventStream, view } = renderStream();

    view.unmount();

    expect(eventStream.closeCount()).toBe(1);
  });
});
