import { describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Share } from '@playliberty/contracts';
import { ProblemCode, ShareLevel } from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import {
  ApiError,
  useAccountPage,
  useCurrentAccount,
  useGrantShare,
  usePlaylistShares,
  useRevokeShare
} from '@playliberty/api-client';
import type * as ApiClientModule from '@playliberty/api-client';
import ShareSheet, { type ShareSheetProps } from './ShareSheet';

jest.mock('@playliberty/api-client', () => ({
  ...jest.requireActual<typeof ApiClientModule>('@playliberty/api-client'),
  useAccountPage: jest.fn(),
  useCurrentAccount: jest.fn(),
  useGrantShare: jest.fn(),
  usePlaylistShares: jest.fn(),
  useRevokeShare: jest.fn()
}));

const sharesMock = usePlaylistShares as jest.MockedFunction<
  typeof usePlaylistShares
>;
const revokeMock = useRevokeShare as jest.MockedFunction<typeof useRevokeShare>;
const meMock = useCurrentAccount as jest.MockedFunction<
  typeof useCurrentAccount
>;
const directoryMock = useAccountPage as jest.MockedFunction<
  typeof useAccountPage
>;
const grantMock = useGrantShare as jest.MockedFunction<typeof useGrantShare>;

const owner = {
  id: 'account-me',
  displayName: 'Owner',
  email: 'owner@example.test',
  avatarUrl: null,
  role: 'user'
} as const;

function directoryRead(overrides: object = {}) {
  return {
    items: [ada.account],
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    error: null,
    hasMore: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    ...overrides
  };
}

const store = { getItem: () => null, setItem: () => {} };

/* Modal renders are slow under the parallel run. */
jest.setTimeout(15000);

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

const ada: Share = {
  accountId: 'account-ada',
  account: { id: 'account-ada', displayName: 'Ada', avatarUrl: null },
  level: ShareLevel.Read,
  createdAt: '2026-10-01T10:00:00.000Z'
};

const bea: Share = {
  accountId: 'account-bea',
  account: { id: 'account-bea', displayName: 'Bea', avatarUrl: null },
  level: ShareLevel.Write,
  createdAt: '2026-10-02T10:00:00.000Z'
};

function queryResult<T = Share[] | undefined>(data: T, overrides: object = {}) {
  return {
    data,
    isPending: false,
    isError: false,
    isFetching: false,
    isSuccess: data !== undefined,
    error: null,
    refetch: jest.fn(),
    ...overrides
  };
}

function mutationResult(overrides: object = {}) {
  return {
    mutate: jest.fn(),
    reset: jest.fn(),
    isPending: false,
    variables: undefined as string | undefined,
    ...overrides
  };
}

function sheetElement(props: ShareSheetProps) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <ShareSheet {...props} />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

async function renderSheet(
  shares: ReturnType<typeof queryResult>,
  revoke: ReturnType<typeof mutationResult> = mutationResult(),
  grant: ReturnType<typeof mutationResult> = mutationResult()
) {
  sharesMock.mockReturnValue(shares as never);
  revokeMock.mockReturnValue(revoke as never);
  meMock.mockReturnValue(queryResult(owner) as never);
  directoryMock.mockReturnValue(directoryRead() as never);
  grantMock.mockReturnValue(grant as never);

  await render(
    sheetElement({
      visible: true,
      playlistId: 'playlist-1',
      onClose: jest.fn()
    })
  );

  return { revoke, grant };
}

function errorHandler(options: unknown): {
  onError?: (error: Error) => void;
} {
  return options as { onError?: (error: Error) => void };
}

describe('the share sheet', () => {
  it('draws the loading body while the read is in flight', async () => {
    await renderSheet(queryResult(undefined, { isPending: true }));

    expect(screen.getByText('Loading accounts.')).toBeOnTheScreen();
  });

  it('says the playlist is private when nobody else holds it', async () => {
    await renderSheet(queryResult([]));

    expect(
      screen.getByText('Nobody else can see this playlist. It is private.')
    ).toBeOnTheScreen();
  });

  it('draws the read failure and retries the read', async () => {
    const failure = new ApiError(503, {
      type: 'about:blank',
      title: 'Service unavailable',
      status: 503,
      code: ProblemCode.InternalError,
      detail: 'The shares are unavailable.'
    });
    const shares = queryResult(undefined, { isError: true, error: failure });

    await renderSheet(shares);

    expect(screen.getByText('Accounts could not be loaded.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('read-failure-retry'));

    expect(shares.refetch).toHaveBeenCalledTimes(1);
  });

  it('names each share with its level', async () => {
    await renderSheet(queryResult([ada, bea]));

    expect(screen.getByText('Ada')).toBeOnTheScreen();
    expect(screen.getByText('Bea')).toBeOnTheScreen();
    expect(screen.getByText('Can listen')).toBeOnTheScreen();
    expect(screen.getByText('Can edit')).toBeOnTheScreen();
    expect(screen.getAllByTestId('share-row')).toHaveLength(2);
  });

  it('names the account on the revoke control', async () => {
    await renderSheet(queryResult([ada, bea]));

    const rows = screen.getAllByTestId('share-row');

    expect(
      within(rows[0]!).getByRole('button', { name: 'Revoke, Ada' })
    ).toBeOnTheScreen();
    expect(
      within(rows[1]!).getByRole('button', { name: 'Revoke, Bea' })
    ).toBeOnTheScreen();
  });

  it('asks once before revoking', async () => {
    const { revoke } = await renderSheet(queryResult([ada]));

    await fireEvent.press(screen.getByTestId('share-revoke'));

    await waitFor(() => {
      expect(screen.getByTestId('share-revoke-confirm')).toBeOnTheScreen();
    });
    expect(
      screen.getByText('Remove access to this playlist?')
    ).toBeOnTheScreen();
    expect(revoke.mutate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('share-revoke-confirm'));

    expect(revoke.mutate).toHaveBeenCalledTimes(1);
    expect(revoke.mutate).toHaveBeenCalledWith(
      'account-ada',
      expect.any(Object)
    );
  });

  it('cancels the question without sending a revoke', async () => {
    const { revoke } = await renderSheet(queryResult([ada]));

    await fireEvent.press(screen.getByTestId('share-revoke'));
    await waitFor(() => {
      expect(screen.getByTestId('share-revoke-cancel')).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId('share-revoke-cancel'));

    await waitFor(() => {
      expect(
        screen.queryByTestId('share-revoke-confirm')
      ).not.toBeOnTheScreen();
    });
    expect(revoke.mutate).not.toHaveBeenCalled();
  });

  it('keeps the row busy until the revoke answers', async () => {
    await renderSheet(
      queryResult([ada]),
      mutationResult({ isPending: true, variables: 'account-ada' })
    );

    expect(screen.getByTestId('share-revoke')).toBeDisabled();
  });

  it('keeps a refused revoke in the sheet with the mapped sentence', async () => {
    const failure = new ApiError(403, {
      type: 'about:blank',
      title: 'Forbidden',
      status: 403,
      code: ProblemCode.Forbidden,
      detail: 'You cannot change this share.'
    });
    const { revoke } = await renderSheet(queryResult([ada]));

    const mutate = revoke.mutate as unknown as {
      mockImplementation: (
        fn: (accountId: string, options: unknown) => void
      ) => void;
    };

    mutate.mockImplementation((_accountId, options) => {
      errorHandler(options).onError?.(failure);
    });

    await fireEvent.press(screen.getByTestId('share-revoke'));
    await waitFor(() => {
      expect(screen.getByTestId('share-revoke-confirm')).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId('share-revoke-confirm'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'You cannot change this share.'
      );
    });
    expect(screen.getByTestId('share-sheet')).toBeOnTheScreen();
    expect(screen.getByText('Ada')).toBeOnTheScreen();
  });

  it('names the account when the refusal has no sentence', async () => {
    const { revoke } = await renderSheet(queryResult([ada]));

    const mutate = revoke.mutate as unknown as {
      mockImplementation: (
        fn: (accountId: string, options: unknown) => void
      ) => void;
    };

    mutate.mockImplementation((_accountId, options) => {
      errorHandler(options).onError?.(new Error('Network request failed'));
    });

    await fireEvent.press(screen.getByTestId('share-revoke'));
    await waitFor(() => {
      expect(screen.getByTestId('share-revoke-confirm')).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId('share-revoke-confirm'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The playlist sharing with Ada could not be removed.'
      );
    });
  });

  it('opens the account picker from the Add row', async () => {
    await renderSheet(queryResult([ada]));

    await fireEvent.press(screen.getByTestId('share-add'));

    await waitFor(() => {
      expect(screen.getByTestId('share-picker')).toBeOnTheScreen();
    });
    expect(
      within(screen.getByTestId('share-picker')).getByText('Ada')
    ).toBeOnTheScreen();
  });

  it('closes the picker on a granted level and keeps the sheet', async () => {
    const { grant } = await renderSheet(queryResult([ada]));
    const mutate = grant.mutate as unknown as {
      mockImplementation: (
        fn: (variables: unknown, options: unknown) => void
      ) => void;
    };

    mutate.mockImplementation((_variables, options) => {
      (options as { onSuccess?: () => void }).onSuccess?.();
    });

    await fireEvent.press(screen.getByTestId('share-add'));
    await waitFor(() => {
      expect(screen.getByTestId('share-picker')).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByTestId('share-picker-level-write'));

    await waitFor(() => {
      expect(screen.queryByTestId('share-picker')).not.toBeOnTheScreen();
    });
    expect(screen.getByTestId('share-sheet')).toBeOnTheScreen();
    expect(grant.mutate).toHaveBeenCalledWith(
      { accountId: 'account-ada', level: ShareLevel.Write },
      expect.any(Object)
    );
  });
});
