import { describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Account, AccountSummary, Share } from '@playliberty/contracts';
import { ProblemCode, ShareLevel, UserRole } from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import {
  ApiError,
  useAccountPage,
  useCurrentAccount,
  useGrantShare
} from '@playliberty/api-client';
import type * as ApiClientModule from '@playliberty/api-client';
import ShareAccountPicker, {
  type ShareAccountPickerProps
} from './ShareAccountPicker';

jest.mock('@playliberty/api-client', () => ({
  ...jest.requireActual<typeof ApiClientModule>('@playliberty/api-client'),
  useAccountPage: jest.fn(),
  useCurrentAccount: jest.fn(),
  useGrantShare: jest.fn()
}));

const meMock = useCurrentAccount as jest.MockedFunction<
  typeof useCurrentAccount
>;
const pageMock = useAccountPage as jest.MockedFunction<typeof useAccountPage>;
const grantMock = useGrantShare as jest.MockedFunction<typeof useGrantShare>;

const store = { getItem: () => null, setItem: () => {} };

/* Modal renders are slow under the parallel run. */
jest.setTimeout(15000);

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

const me: Account = {
  id: 'account-me',
  displayName: 'Owner',
  email: 'owner@example.test',
  avatarUrl: null,
  role: UserRole.User
};

const ada: AccountSummary = {
  id: 'account-ada',
  displayName: 'Ada',
  avatarUrl: null
};
const bea: AccountSummary = {
  id: 'account-bea',
  displayName: 'Bea',
  avatarUrl: null
};
const cy: AccountSummary = {
  id: 'account-cy',
  displayName: 'Cy',
  avatarUrl: null
};

const adaRead: Share = {
  accountId: 'account-ada',
  account: ada,
  level: ShareLevel.Read,
  createdAt: '2026-10-01T10:00:00.000Z'
};

function queryResult(data: unknown, overrides: object = {}) {
  return {
    data,
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
    ...overrides
  };
}

function pageRead(overrides: object = {}) {
  return {
    items: [ada, bea],
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

function mutationResult(overrides: object = {}) {
  return {
    mutate: jest.fn(),
    reset: jest.fn(),
    isPending: false,
    variables: undefined as { accountId: string } | undefined,
    ...overrides
  };
}

function pickerElement(props: ShareAccountPickerProps) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <ShareAccountPicker {...props} />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

async function renderPicker(
  page: ReturnType<typeof pageRead> = pageRead(),
  grant: ReturnType<typeof mutationResult> = mutationResult(),
  overrides: Partial<ShareAccountPickerProps> = {}
) {
  meMock.mockReturnValue(queryResult(me) as never);
  pageMock.mockReturnValue(page as never);
  grantMock.mockReturnValue(grant as never);

  const props: ShareAccountPickerProps = {
    visible: true,
    playlistId: 'playlist-1',
    shares: [adaRead],
    onClose: jest.fn(),
    ...overrides
  };

  const view = await render(pickerElement(props));

  return { props, page, grant, view };
}

function errorHandler(options: unknown): {
  onError?: (error: Error) => void;
} {
  return options as { onError?: (error: Error) => void };
}

describe('the share account picker', () => {
  it('leaves the owner out and keeps the directory order', async () => {
    await renderPicker(pageRead({ items: [me, cy, ada, bea] }));

    const rows = screen.getAllByTestId('share-picker-row');

    expect(screen.queryByText('Owner')).not.toBeOnTheScreen();
    expect(within(rows[0]!).getByText('Cy')).toBeOnTheScreen();
    expect(within(rows[1]!).getByText('Ada')).toBeOnTheScreen();
    expect(within(rows[2]!).getByText('Bea')).toBeOnTheScreen();
  });

  it('asks for the next page at the end of the list', async () => {
    const { page } = await renderPicker(pageRead({ hasMore: true }));

    await fireEvent.scroll(screen.getByTestId('share-picker-list'), {
      nativeEvent: {
        contentOffset: { y: 900 },
        contentSize: { height: 1000 },
        layoutMeasurement: { height: 400 }
      }
    });

    expect(page.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('does not ask for a next page while one is already loading', async () => {
    const { page } = await renderPicker(
      pageRead({ hasMore: true, isFetchingNextPage: true })
    );

    await fireEvent.scroll(screen.getByTestId('share-picker-list'), {
      nativeEvent: {
        contentOffset: { y: 900 },
        contentSize: { height: 1000 },
        layoutMeasurement: { height: 400 }
      }
    });

    expect(page.fetchNextPage).not.toHaveBeenCalled();
  });

  it('gives the next-page retry a full target', async () => {
    await renderPicker(pageRead({ hasMore: true, isFetchNextPageError: true }));

    expect(screen.getByTestId('share-picker-more-retry')).toHaveStyle({
      minHeight: 48
    });
  });

  it('names the account in each level control', async () => {
    await renderPicker();

    const row = screen.getAllByTestId('share-picker-row')[0]!;

    expect(
      within(row).getByRole('radio', { name: 'Can listen, Ada' })
    ).toBeOnTheScreen();
    expect(
      within(row).getByRole('radio', { name: 'Can edit, Ada' })
    ).toBeOnTheScreen();
  });

  it('marks the level a share already holds', async () => {
    await renderPicker();

    const row = screen.getAllByTestId('share-picker-row')[0]!;

    expect(
      within(row).getByRole('radio', { name: 'Can listen, Ada' }).props
        .accessibilityState
    ).toMatchObject({ checked: true });
    expect(
      within(row).getByRole('radio', { name: 'Can edit, Ada' }).props
        .accessibilityState
    ).toMatchObject({ checked: false });
  });

  it('sends one grant when the level changes', async () => {
    const { grant } = await renderPicker();

    const row = screen.getAllByTestId('share-picker-row')[0]!;

    await fireEvent.press(
      within(row).getByRole('radio', { name: 'Can edit, Ada' })
    );

    expect(grant.mutate).toHaveBeenCalledTimes(1);
    expect(grant.mutate).toHaveBeenCalledWith(
      { accountId: 'account-ada', level: ShareLevel.Write },
      expect.any(Object)
    );
  });

  it('sends nothing when the held level is pressed and closes', async () => {
    const { grant, props } = await renderPicker();

    const row = screen.getAllByTestId('share-picker-row')[0]!;

    await fireEvent.press(
      within(row).getByRole('radio', { name: 'Can listen, Ada' })
    );

    expect(grant.mutate).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps both levels disabled while a row answers', async () => {
    await renderPicker(
      pageRead(),
      mutationResult({
        isPending: true,
        variables: { accountId: 'account-ada' }
      })
    );

    const row = screen.getAllByTestId('share-picker-row')[0]!;

    expect(
      within(row).getByRole('radio', { name: 'Can listen, Ada' })
    ).toBeDisabled();
    expect(
      within(row).getByRole('radio', { name: 'Can edit, Ada' })
    ).toBeDisabled();
  });

  it('keeps a refused grant in the picker with the mapped sentence', async () => {
    const failure = new ApiError(403, {
      type: 'about:blank',
      title: 'Forbidden',
      status: 403,
      code: ProblemCode.Forbidden,
      detail: 'You cannot share this playlist.'
    });
    const { grant } = await renderPicker();

    const mutate = grant.mutate as unknown as {
      mockImplementation: (
        fn: (variables: unknown, options: unknown) => void
      ) => void;
    };

    mutate.mockImplementation((_variables, options) => {
      errorHandler(options).onError?.(failure);
    });

    const row = screen.getAllByTestId('share-picker-row')[0]!;

    await fireEvent.press(
      within(row).getByRole('radio', { name: 'Can edit, Ada' })
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'You cannot share this playlist.'
      );
    });
    expect(screen.getByTestId('share-picker')).toBeOnTheScreen();
  });

  it('names the account when the refusal has no sentence', async () => {
    const { grant } = await renderPicker();

    const mutate = grant.mutate as unknown as {
      mockImplementation: (
        fn: (variables: unknown, options: unknown) => void
      ) => void;
    };

    mutate.mockImplementation((_variables, options) => {
      errorHandler(options).onError?.(new Error('Network request failed'));
    });

    const row = screen.getAllByTestId('share-picker-row')[0]!;

    await fireEvent.press(
      within(row).getByRole('radio', { name: 'Can edit, Ada' })
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The playlist sharing with Ada has failed.'
      );
    });
  });

  it('closes without a choice and sends nothing', async () => {
    const { grant, props } = await renderPicker();

    expect(
      within(screen.getByTestId('share-picker-done')).getByText('Done')
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('share-picker-done'));

    expect(grant.mutate).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('draws the account read failure and retries it', async () => {
    const page = pageRead({
      isError: true,
      isSuccess: false,
      error: new Error()
    });

    await renderPicker(page);

    expect(screen.getByText('Accounts could not be loaded.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('read-failure-retry'));

    expect(page.refetch).toHaveBeenCalledTimes(1);
  });
});
