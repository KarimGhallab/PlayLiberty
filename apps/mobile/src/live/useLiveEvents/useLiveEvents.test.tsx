import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';
import { AppState } from 'react-native';

import { LiveEventType } from '@playliberty/contracts';

import {
  SessionStatus,
  useSessionStore
} from '../../auth/sessionStore/sessionStore';
import type { ApiConfig } from '../../auth/useApiConfig';
import {
  type LiveEventConnection,
  type LiveEventFactory,
  LiveEventFailure,
  type LiveEventHandlers,
  type LiveEventSource
} from '../liveEventStream/liveEventStream';
import { useLiveEvents } from './useLiveEvents';

jest.mock('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {}
}));

const config: ApiConfig = {
  baseUrl: 'https://instance.test',
  token: { id: 'token-id', secret: 'token-secret' }
};

interface FakeConnection {
  readonly source: LiveEventSource;
  readonly handlers: LiveEventHandlers;
  readonly close: ReturnType<typeof jest.fn>;
}

function fakeFactory(): {
  factory: LiveEventFactory;
  connections: FakeConnection[];
} {
  const connections: FakeConnection[] = [];
  const factory: LiveEventFactory = (source, handlers) => {
    const close = jest.fn();
    connections.push({ source, handlers, close });

    const connection: LiveEventConnection = { close };

    return connection;
  };

  return { factory, connections };
}

let appStateListener: ((state: string) => void) | null = null;

beforeEach(() => {
  appStateListener = null;
  useSessionStore.setState({ status: SessionStatus.SignedIn });
  Object.defineProperty(AppState, 'currentState', {
    value: 'active',
    configurable: true
  });
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, handler) => {
      appStateListener = handler as (state: string) => void;

      return {
        remove: jest.fn()
      } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderStream(
  factory: LiveEventFactory,
  given: ApiConfig | null = config
) {
  const queryClient = new QueryClient();

  const view = await renderHook(() => useLiveEvents(given, factory), {
    wrapper: ({ children }: { readonly children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  });

  return { queryClient, view };
}

async function changeState(state: string): Promise<void> {
  await act(() => {
    appStateListener?.(state);
  });
}

describe('the live stream', () => {
  it('opens one connection with the token headers', async () => {
    const { factory, connections } = fakeFactory();

    await renderStream(factory);

    expect(connections).toHaveLength(1);
    expect(connections[0]?.source.uri).toBe(
      'https://instance.test/api/v1/events'
    );
    expect(connections[0]?.source.headers).toEqual({
      'P-Access-Token-Id': 'token-id',
      'P-Access-Token': 'token-secret'
    });
  });

  it('stays closed while there is no token', async () => {
    const { factory, connections } = fakeFactory();

    await renderStream(factory, null);

    expect(connections).toHaveLength(0);
  });

  it('closes the connection when the app leaves the foreground', async () => {
    const { factory, connections } = fakeFactory();
    await renderStream(factory);

    await changeState('background');

    expect(connections[0]?.close).toHaveBeenCalledTimes(1);
  });

  it('keeps one connection when the app is told it is active twice', async () => {
    const { factory, connections } = fakeFactory();
    await renderStream(factory);

    await changeState('active');

    expect(connections).toHaveLength(1);
  });

  it('refetches every read and reconnects on the way back', async () => {
    const { factory, connections } = fakeFactory();
    const { queryClient } = await renderStream(factory);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    await changeState('background');
    await changeState('active');

    expect(invalidate).toHaveBeenCalledWith();
    expect(connections).toHaveLength(2);
  });

  it('invalidates the reads a known event names', async () => {
    const { factory, connections } = fakeFactory();
    const { queryClient } = await renderStream(factory);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    await act(() => {
      connections[0]?.handlers.onMessage(
        JSON.stringify({
          type: LiveEventType.PlaylistChanged,
          playlistId: 'playlist-1'
        })
      );
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['playlist', 'playlist-1']
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['playlists'] });
  });

  it('drops an event kind it does not know', async () => {
    const { factory, connections } = fakeFactory();
    const { queryClient } = await renderStream(factory);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    await act(() => {
      connections[0]?.handlers.onMessage(JSON.stringify({ type: 'nope' }));
    });

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('backs off after a drop and reconnects', async () => {
    jest.useFakeTimers();
    const { factory, connections } = fakeFactory();
    await renderStream(factory);

    await act(() => {
      connections[0]?.handlers.onError(LiveEventFailure.Dropped);
    });
    expect(connections).toHaveLength(1);

    await act(() => {
      jest.advanceTimersByTime(1_000);
    });
    expect(connections).toHaveLength(2);
  });

  it('stops retrying and signs out when the edge refuses', async () => {
    jest.useFakeTimers();
    const { factory, connections } = fakeFactory();
    await renderStream(factory);

    await act(async () => {
      connections[0]?.handlers.onError(LiveEventFailure.Refused);
    });

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe(SessionStatus.SignedOut);
    });

    await act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(connections).toHaveLength(1);
  });
});
