import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';

import { LiveEventSchema, endpoints } from '@playliberty/contracts';
import type { LiveEvent } from '@playliberty/contracts';

import { cacheEffects } from '../cacheEffects/cacheEffects';
import { API_PREFIX, ApiError } from '../client/client';
import { readEndpoint } from '../endpoints/endpoints';
import { invalidateForLiveEvent } from '../liveEvents/liveEvents';

/*
 * The tab's one live connection, mounted in the shell and reopened on a
 * backoff, which re-reads everything the tab holds so a gap closes without a
 * timer. A refusal uses the re-auth guard; `EventStreamContext` is a test seam.
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

export const RECONNECT_BASE_MS = 1_000;
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
     * Own the retry so a refusal stops it and a transient drop backs off,
     * rather than the browser reconnecting on one schedule forever.
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
     * A drop is not necessarily an expiry, so ask an authenticated read: a
     * refusal stops the retry and re-reads; anything else backs off.
     */
    async function recover(): Promise<void> {
      try {
        await readEndpoint(endpoints.currentAccount);
        reconnect();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          stopped = true;
          cacheEffects.everythingChanged(queryClient);
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
 * Drop a frame the schema does not know rather than throw: an unknown event
 * kind is a missed invalidation, not a lost connection.
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
