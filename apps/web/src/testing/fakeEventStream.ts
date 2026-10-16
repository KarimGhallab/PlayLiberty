import type {
  EventStreamFactory,
  EventStreamHandlers
} from '../shared/api/useEventStream/useEventStream';

/*
 * A stand-in for `EventSource`, which jsdom lacks and MSW cannot fake: a test
 * supplies it and drives frames by hand. A closed connection is removed, so a
 * frame after a reconnect reaches only the live one.
 */
export interface FakeEventStream {
  readonly factory: EventStreamFactory;
  /** The URLs the hook opened, in order. */
  readonly urls: string[];
  /** Deliver a message frame to every open connection. */
  emit(data: string): void;
  open(): void;
  error(): void;
  connectionCount(): number;
  closeCount(): number;
}

export function createFakeEventStream(): FakeEventStream {
  const handlers = new Set<EventStreamHandlers>();
  const urls: string[] = [];
  let connections = 0;
  let closes = 0;

  return {
    factory: (url, nextHandlers) => {
      connections += 1;
      urls.push(url);
      handlers.add(nextHandlers);

      return {
        close: () => {
          closes += 1;
          handlers.delete(nextHandlers);
        }
      };
    },
    urls,
    emit: data => {
      for (const handler of [...handlers]) {
        handler.onMessage(data);
      }
    },
    open: () => {
      for (const handler of [...handlers]) {
        handler.onOpen();
      }
    },
    error: () => {
      for (const handler of [...handlers]) {
        handler.onError();
      }
    },
    connectionCount: () => connections,
    closeCount: () => closes
  };
}
