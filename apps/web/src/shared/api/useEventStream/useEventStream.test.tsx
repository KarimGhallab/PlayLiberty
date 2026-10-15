import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveEventType } from '@playliberty/contracts';

import { createFakeEventStream } from '../../../testing/fakeEventStream';
import { restoreLocation, stubLocationAssign } from '../../../testing/location';
import { server } from '../../../testing/mocks/server';
import { cacheEffects } from '../cacheEffects/cacheEffects';
import {
  EventStreamContext,
  RECONNECT_BASE_MS,
  useEventStream
} from './useEventStream';

/*
 * The socket is the factory's, so a test injects a fake and emits the frames a
 * server would send, which is the behavior that matters here; the real wire is
 * covered end to end.
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

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it('hands a playlist change to the mapping', () => {
    const { eventStream } = renderStream();
    const playlistChanged = vi.spyOn(cacheEffects, 'playlistChanged');

    act(() => {
      eventStream.emit(
        JSON.stringify({
          type: LiveEventType.PlaylistChanged,
          playlistId: 'playlist-1'
        })
      );
    });

    expect(playlistChanged).toHaveBeenCalledWith(
      expect.anything(),
      'playlist-1'
    );
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

describe('useEventStream recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreLocation();
  });

  it('reopens on a backoff and re-reads everything when it opens again', async () => {
    const { invalidate, eventStream } = renderStream();
    expect(eventStream.connectionCount()).toBe(1);

    await act(async () => {
      eventStream.error();
      await vi.advanceTimersByTimeAsync(0);
    });

    // The backoff has not elapsed, so nothing has reopened yet.
    expect(eventStream.connectionCount()).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECONNECT_BASE_MS);
    });

    expect(eventStream.connectionCount()).toBe(2);

    await act(async () => {
      eventStream.open();
      eventStream.emit(JSON.stringify({ type: LiveEventType.Ready }));
    });

    expect(invalidate).toHaveBeenCalledWith();
  });

  it('waits longer before each reopen', async () => {
    const { eventStream } = renderStream();

    await act(async () => {
      eventStream.error();
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECONNECT_BASE_MS);
    });
    expect(eventStream.connectionCount()).toBe(2);

    await act(async () => {
      eventStream.error();
      await vi.advanceTimersByTimeAsync(0);
    });
    // The second backoff is twice the first, so the first window is not enough.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECONNECT_BASE_MS);
    });
    expect(eventStream.connectionCount()).toBe(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECONNECT_BASE_MS);
    });
    expect(eventStream.connectionCount()).toBe(3);
  });

  it('stops and re-reads rather than retrying when the session is refused', async () => {
    stubLocationAssign();
    server.use(
      http.get(
        'http://localhost:3000/api/v1/me',
        () => new HttpResponse(null, { status: 401 })
      )
    );
    const { invalidate, eventStream } = renderStream();

    await act(async () => {
      eventStream.error();
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECONNECT_BASE_MS * 4);
    });

    expect(eventStream.connectionCount()).toBe(1);
    expect(invalidate).toHaveBeenCalled();
  });
});
