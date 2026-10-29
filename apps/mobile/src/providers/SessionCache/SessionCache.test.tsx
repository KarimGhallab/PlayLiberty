import { beforeEach, describe, expect, it } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';

import { currentAccountKey, libraryKey } from '@playliberty/query';

import {
  SessionStatus,
  useSessionStore
} from '../../auth/sessionStore/sessionStore';
import SessionCache from './SessionCache';

function seeded(): QueryClient {
  const queryClient = new QueryClient();
  queryClient.setQueryData(currentAccountKey, { id: 'account-1' });
  queryClient.setQueryData(libraryKey, [{ id: 'playlist-1' }]);

  return queryClient;
}

async function renderGuard(queryClient: QueryClient): Promise<void> {
  await render(
    <QueryClientProvider client={queryClient}>
      <SessionCache />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useSessionStore.setState({ status: SessionStatus.SignedIn });
});

describe('the session cache', () => {
  it('drops every read when the session ends', async () => {
    const queryClient = seeded();
    await renderGuard(queryClient);

    await act(() => {
      useSessionStore.setState({ status: SessionStatus.SignedOut });
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(currentAccountKey)).toBeUndefined();
    });
    expect(queryClient.getQueryData(libraryKey)).toBeUndefined();
    queryClient.clear();
  });

  it('keeps the reads while the session holds', async () => {
    useSessionStore.setState({ status: SessionStatus.Loading });
    const queryClient = seeded();
    await renderGuard(queryClient);

    await act(() => {
      useSessionStore.setState({ status: SessionStatus.SignedIn });
    });

    expect(queryClient.getQueryData(currentAccountKey)).toEqual({
      id: 'account-1'
    });
    expect(queryClient.getQueryData(libraryKey)).toEqual([
      { id: 'playlist-1' }
    ]);
    queryClient.clear();
  });
});
