import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';

import { AccountSummarySchema, LiveEventSchema } from '@playliberty/contracts';
import type { LiveEvent } from '@playliberty/contracts';

import { API_PREFIX, ApiError, apiGet } from './client';
import { invalidateForLiveEvent } from './liveEvents';

/*
 * The tab's one live connection, mounted by the shell rather than a route, so it
 * survives navigation and there is exactly one per tab. The server pushes an
 * invalidation hint when server state changes; the hook hands it to the mapping
 * in `liveEvents`, which refetches the reads it names.
 *
 * A connection that drops is reopened on a backoff, and the reopen re-reads
 * everything the tab holds, so the gap between the last event and the new
 * connection is closed without a timer. A connection the edge refuses is the
 * other case: the hook runs the same re-authentication guard every other request
 * uses, through an ordinary authenticated read, so an expired session is
 * re-established by one navigation and a second refusal is left to the screens
 * rather than retried in a loop.
 *
 * The factory is a seam, not indirection for its own sake: jsdom has no
 * `EventSource` and MSW cannot fake one, so a component test injects a factory
 * that emits a frame, and the real wire is covered end to end.
 */

export interface EventStreamHandlers {
  onOpen: () => void;
  onMessage: (data: string) => void;
  onError: () => void;
}

export interface EventStreamConnection {
  close(): void;
}

export type EventStreamFactory = (
  url: string,
  handlers: EventStreamHandlers
) => EventStreamConnection;

export function browserEventStream(
  url: string,
  handlers: EventStreamHandlers
): EventStreamConnection {
  const source = new EventSource(url);
  source.onopen = () => handlers.onOpen();
  source.onmessage = event => handlers.onMessage(event.data);
  source.onerror = () => handlers.onError();

  return { close: () => source.close() };
}

export const EventStreamContext =
  createContext<EventStreamFactory>(browserEventStream);

/** The first delay before a dropped connection is reopened, doubling each time. */
export const RECONNECT_BASE_MS = 1_000;
/** The longest delay between reopen attempts. */
const RECONNECT_MAX_MS = 30_000;

export function useEventStream(): void {
  const factory = useContext(EventStreamContext);
  const queryClient = useQueryClient();

  useEffect(() => {
    let stopped = false;
    let connection: EventStreamConnection | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;

    function connect(): void {
      if (stopped) {
        return;
      }

      connection = factory(`${API_PREFIX}/events`, {
        onOpen: () => {
          failures = 0;
        },
        onMessage: data => {
          const event = parseLiveEvent(data);

          if (event !== null) {
            invalidateForLiveEvent(queryClient, event);
          }
        },
        onError: () => {
          connection?.close();
          connection = null;
          void recover();
        }
      });
    }

    /*
     * The backoff. The browser would retry an `EventSource` on its own, but a
     * refusal would then be retried on the same schedule forever; owning the
     * retry lets a refused session stop it and a transient drop wait longer each
     * time rather than hammering a dead edge.
     */
    function reconnect(): void {
      if (stopped) {
        return;
      }

      const delay = Math.min(
        RECONNECT_BASE_MS * 2 ** failures,
        RECONNECT_MAX_MS
      );
      failures += 1;
      timer = setTimeout(connect, delay);
    }

    /*
     * A dropped connection is not necessarily an expired session, so the hook
     * asks the API a question it can answer: an ordinary authenticated read,
     * which runs the re-authentication guard exactly as every other request
     * does. A refusal means the session is gone, so the retry stops and the
     * reads are asked again, which is how the problem reaches a screen. Anything
     * else is transient, and the connection is reopened on the backoff.
     */
    async function recover(): Promise<void> {
      try {
        await apiGet('/me', AccountSummarySchema);
        reconnect();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          stopped = true;
          void queryClient.invalidateQueries();
          return;
        }

        reconnect();
      }
    }

    connect();

    return () => {
      stopped = true;
      connection?.close();

      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [factory, queryClient]);
}

/*
 * A frame the schema does not know is dropped rather than thrown: the stream is
 * the server's, a new event kind the client has not been rebuilt for is a read
 * it does not invalidate rather than a connection the tab loses.
 */
function parseLiveEvent(data: string): LiveEvent | null {
  let body: unknown;

  try {
    body = JSON.parse(data);
  } catch {
    return null;
  }

  const parsed = LiveEventSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}
