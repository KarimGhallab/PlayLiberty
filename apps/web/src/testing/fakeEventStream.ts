import type {
  EventStreamFactory,
  EventStreamHandlers
} from '../shared/api/useEventStream';

/*
 * A stand-in for `EventSource`, which jsdom does not have and MSW cannot fake. A
 * test provides it through `EventStreamContext` and drives frames by hand, so it
 * asserts the invalidation a frame causes rather than a socket.
 */
export interface FakeEventStream {
  readonly factory: EventStreamFactory;
  /** The URLs the hook opened, in order. */
  readonly urls: string[];
  /** Deliver a frame to every open connection. */
  emit(data: string): void;
  connectionCount(): number;
  closeCount(): number;
}

export function createFakeEventStream(): FakeEventStream {
  const handlers: EventStreamHandlers[] = [];
  const urls: string[] = [];
  let connections = 0;
  let closes = 0;

  return {
    factory: (url, nextHandlers) => {
      connections += 1;
      urls.push(url);
      handlers.push(nextHandlers);

      return {
        close: () => {
          closes += 1;
        }
      };
    },
    urls,
    emit: data => {
      for (const handler of handlers) {
        handler.onMessage(data);
      }
    },
    connectionCount: () => connections,
    closeCount: () => closes
  };
}
