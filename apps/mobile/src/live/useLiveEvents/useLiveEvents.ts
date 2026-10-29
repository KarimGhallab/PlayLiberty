import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { LiveEvent } from '@playliberty/contracts';
import { LiveEventSchema } from '@playliberty/contracts';
import { invalidateForLiveEvent } from '@playliberty/query';

import { useSessionStore } from '../../auth/sessionStore/sessionStore';
import type { ApiConfig } from '../../auth/useApiConfig';
import { eventsSource } from '../eventsSource';
import {
  type LiveEventConnection,
  type LiveEventFactory,
  LiveEventFailure
} from '../liveEventStream/liveEventStream';

/* A drop backs off; a refusal ends the session. Nothing polls: the connection
 * is the only timer, and the app's own foregrounding is the catch-up. */
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

/** One live connection while the app is foregrounded. */
export function useLiveEvents(
  config: ApiConfig | null,
  factory: LiveEventFactory
): void {
  const queryClient = useQueryClient();
  const expire = useSessionStore(state => state.expire);

  useEffect(() => {
    if (config === null) {
      return;
    }

    const source = eventsSource(config);
    let stopped = false;
    let connection: LiveEventConnection | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;

    function close(): void {
      connection?.close();
      connection = null;

      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function reconnect(): void {
      if (stopped) {
        return;
      }

      const delay = Math.min(BACKOFF_BASE_MS * 2 ** failures, BACKOFF_MAX_MS);
      failures += 1;
      timer = setTimeout(() => {
        timer = null;
        connect();
      }, delay);
    }

    function connect(): void {
      if (stopped || connection !== null) {
        return;
      }

      connection = factory(source, {
        onOpen: () => {
          failures = 0;
        },
        onMessage: data => {
          const event = parseEvent(data);

          if (event !== null) {
            invalidateForLiveEvent(queryClient, event);
          }
        },
        onError: failure => {
          close();

          if (failure === LiveEventFailure.Refused) {
            stopped = true;
            void expire();
            return;
          }

          reconnect();
        }
      });
    }

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void queryClient.invalidateQueries();
        connect();
        return;
      }

      close();
    });

    if (AppState.currentState === 'active') {
      connect();
    }

    return () => {
      stopped = true;
      subscription.remove();
      close();
    };
  }, [config, expire, factory, queryClient]);
}

/* An event kind the schema does not know is a missed invalidation, not a lost
 * connection. */
function parseEvent(data: string): LiveEvent | null {
  let body: unknown;

  try {
    body = JSON.parse(data);
  } catch {
    return null;
  }

  const parsed = LiveEventSchema.safeParse(body);

  return parsed.success ? parsed.data : null;
}
