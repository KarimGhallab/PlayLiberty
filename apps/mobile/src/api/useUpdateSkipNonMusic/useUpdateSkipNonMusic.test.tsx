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
import type { ReactNode } from 'react';

import {
  type Playlist,
  PlaylistSort,
  PlaylistSyncStatus,
  Provider
} from '@playliberty/contracts';
import { playlistKey } from '@playliberty/query';

import { apiClient } from '../client';
import { useUpdateSkipNonMusic } from './useUpdateSkipNonMusic';

jest.mock('../client', () => ({
  apiClient: { send: jest.fn() }
}));

const sendMock = apiClient.send as unknown as jest.Mock<
  (endpoint: unknown, ...rest: unknown[]) => Promise<unknown>
>;

const playlist: Playlist = {
  id: 'playlist-1',
  ownerAccountId: 'account-1',
  name: 'Rain On The Window',
  coverTrackId: null,
  coverUpdatedAt: null,
  provider: Provider.Youtube,
  sourcePlaylistId: 'PL-demo',
  syncStatus: PlaylistSyncStatus.Idle,
  lastSyncedAt: '2026-09-29T12:00:00.000Z',
  trackCount: 8,
  skipNonMusic: true,
  sort: PlaylistSort.Playlist,
  access: 'owner',
  hasShares: false,
  pinned: false,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z'
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });

  return { promise, resolve, reject };
}

async function renderSkip() {
  /* Nothing observes these entries, so their garbage collectors must not hold
   * the test open. */
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity },
      mutations: { gcTime: Infinity }
    }
  });
  queryClient.setQueryData(playlistKey(playlist.id), playlist);

  const view = await renderHook(() => useUpdateSkipNonMusic(playlist.id), {
    wrapper: ({ children }: { readonly children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  });

  cleanUp = () => {
    view.unmount();
    queryClient.clear();
  };

  return {
    queryClient,
    view,
    saved: () => queryClient.getQueryData<Playlist>(playlistKey(playlist.id))
  };
}

let cleanUp: (() => void) | null = null;

beforeEach(() => {
  sendMock.mockReset();
});

afterEach(() => {
  cleanUp?.();
  cleanUp = null;
});

describe('the skip setting write', () => {
  it('moves the value on the press and puts it back on a refusal', async () => {
    const gate = deferred<Playlist>();
    sendMock.mockReturnValue(gate.promise);
    const { view, saved } = await renderSkip();

    await act(() => {
      view.result.current.mutate(false);
    });
    await waitFor(() => {
      expect(saved()?.skipNonMusic).toBe(false);
    });

    await act(async () => {
      gate.reject(new Error('The write is refused.'));
    });
    await waitFor(() => {
      expect(view.result.current.isError).toBe(true);
    });

    expect(saved()?.skipNonMusic).toBe(true);
  });

  it('keeps the playlist the server answered', async () => {
    sendMock.mockResolvedValue({
      ...playlist,
      name: 'The saved name',
      skipNonMusic: false
    });
    const { view, saved } = await renderSkip();

    await act(() => {
      view.result.current.mutate(false);
    });
    await waitFor(() => {
      expect(view.result.current.isSuccess).toBe(true);
    });

    expect(saved()).toMatchObject({
      name: 'The saved name',
      skipNonMusic: false
    });
  });
});
