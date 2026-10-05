import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect } from 'react';

import { LiveEventSchema } from '@playliberty/contracts';
import type { LiveEvent } from '@playliberty/contracts';

import { API_PREFIX } from './client';
import { invalidateForLiveEvent } from './liveEvents';

/*
 * The tab's one live connection, mounted by the shell rather than a route, so it
 * survives navigation and there is exactly one per tab. The server pushes an
 * invalidation hint when server state changes; the hook hands it to the mapping
 * in `liveEvents`, which refetches the reads it names.
 *
 * The factory is a seam, not indirection for its own sake: jsdom has no
 * `EventSource` and MSW cannot fake one, so a component test injects a factory
 * that emits a frame, and the real wire is covered end to end. The default is the
 * browser's own `EventSource`, which reconnects on its own and re-delivers
 * `ready` when it does.
 */

export interface EventStreamHandlers {
  onMessage: (data: string) => void;
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
  source.onmessage = event => handlers.onMessage(event.data);

  return { close: () => source.close() };
}

export const EventStreamContext =
  createContext<EventStreamFactory>(browserEventStream);

export function useEventStream(): void {
  const factory = useContext(EventStreamContext);
  const queryClient = useQueryClient();

  useEffect(() => {
    const connection = factory(`${API_PREFIX}/events`, {
      onMessage: data => {
        const event = parseLiveEvent(data);

        if (event !== null) {
          invalidateForLiveEvent(queryClient, event);
        }
      }
    });

    return () => {
      connection.close();
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
