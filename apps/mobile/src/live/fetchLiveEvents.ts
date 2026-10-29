import { fetch } from 'expo/fetch';

import {
  type LiveEventConnection,
  type LiveEventFactory,
  LiveEventFailure,
  createFrameReader
} from './liveEventStream/liveEventStream';

/* React Native has no `EventSource`, and a browser one cannot set headers, so
 * the stream is the body of a fetch. Expo's fetch streams; the global one
 * buffers the whole response. */
export const fetchLiveEvents: LiveEventFactory = (source, handlers) => {
  const controller = new AbortController();
  let closed = false;

  void (async () => {
    try {
      const response = await fetch(source.uri, {
        headers: source.headers,
        signal: controller.signal
      });

      if (closed) {
        return;
      }

      if (response.status === 401) {
        handlers.onError(LiveEventFailure.Refused);
        return;
      }

      if (!response.ok || response.body === null) {
        handlers.onError(LiveEventFailure.Dropped);
        return;
      }

      handlers.onOpen();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const read = createFrameReader(handlers.onMessage);

      for (;;) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        read(decoder.decode(value, { stream: true }));
      }

      if (!closed) {
        handlers.onError(LiveEventFailure.Dropped);
      }
    } catch {
      if (!closed) {
        handlers.onError(LiveEventFailure.Dropped);
      }
    }
  })();

  const connection: LiveEventConnection = {
    close: () => {
      closed = true;
      controller.abort();
    }
  };

  return connection;
};
