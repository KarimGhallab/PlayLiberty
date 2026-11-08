import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  useCheckEgress,
  useCurrentAccount,
  useEgress,
  useSwitchEgress
} from '@playliberty/api-client';
import type * as ApiClientModule from '@playliberty/api-client';
import type { Account, EgressRead } from '@playliberty/contracts';
import { EgressStatus, UserRole } from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import { SessionStatus } from '../../../auth/sessionStore/sessionStore';
import { useSession } from '../../../auth/useSession';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import EgressGate from './EgressGate';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() }
}));

jest.mock('@playliberty/api-client', () => ({
  ...jest.requireActual<typeof ApiClientModule>('@playliberty/api-client'),
  useCheckEgress: jest.fn(),
  useCurrentAccount: jest.fn(),
  useEgress: jest.fn(),
  useSwitchEgress: jest.fn()
}));

jest.mock('../../../auth/useSession', () => ({
  useSession: jest.fn()
}));

const useCurrentAccountMock = useCurrentAccount as jest.MockedFunction<
  typeof useCurrentAccount
>;
const useCheckEgressMock = useCheckEgress as jest.MockedFunction<
  typeof useCheckEgress
>;
const useEgressMock = useEgress as jest.MockedFunction<typeof useEgress>;
const useSwitchEgressMock = useSwitchEgress as jest.MockedFunction<
  typeof useSwitchEgress
>;
const useSessionMock = useSession as jest.MockedFunction<typeof useSession>;

function idleMutation() {
  return {
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
    error: null
  } as never;
}

const store = { getItem: () => null, setItem: () => {} };
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

const admin: Account = {
  id: 'account-1',
  displayName: 'Milloser',
  email: null,
  avatarUrl: null,
  role: UserRole.Admin
};

const READ: EgressRead = {
  agentReachable: true,
  configs: [
    {
      name: '01-FR-634',
      endpoint: '185.0.0.1:51820',
      status: EgressStatus.Ok,
      active: true,
      lastAttemptAt: '2026-10-31T08:00:00.000Z',
      lastCheckAt: null,
      lastExitIp: null,
      lastError: null
    }
  ]
};

function accountResult(data: Account | undefined, pending = false) {
  return {
    data,
    isPending: pending,
    isError: false,
    isSuccess: data !== undefined,
    isFetching: false,
    isRefetching: false,
    error: null,
    refetch: jest.fn()
  } as never;
}

function egressResult(data: EgressRead) {
  return {
    data,
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    isRefetching: false,
    error: null,
    refetch: jest.fn()
  } as never;
}

function signedIn(status: SessionStatus) {
  return { status, signOut: jest.fn() } as never;
}

function renderGate() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <EgressGate />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  usePlayerStore.getState().clear();
  useSessionMock.mockReturnValue(signedIn(SessionStatus.SignedIn));
  useCurrentAccountMock.mockReturnValue(accountResult(admin));
  useEgressMock.mockReturnValue(egressResult(READ));
  useSwitchEgressMock.mockReturnValue(idleMutation());
  useCheckEgressMock.mockReturnValue(idleMutation());
});

describe('the egress gate', () => {
  it('opens the pool for an admin', async () => {
    await renderGate();

    expect(useCurrentAccountMock).toHaveBeenCalledWith(true);
    expect(useEgressMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('egress-screen')).toBeOnTheScreen();
    expect(screen.getByText('01-FR-634')).toBeOnTheScreen();
  });

  it('answers not-found to a normal account without reading the pool', async () => {
    useCurrentAccountMock.mockReturnValue(
      accountResult({ ...admin, role: UserRole.User })
    );

    await renderGate();

    expect(
      screen.getByRole('header', { name: 'Page not found' })
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('egress-screen')).not.toBeOnTheScreen();
    expect(useEgressMock).not.toHaveBeenCalled();
  });

  it('answers not-found when no one is signed in', async () => {
    useSessionMock.mockReturnValue(signedIn(SessionStatus.SignedOut));
    useCurrentAccountMock.mockReturnValue(accountResult(undefined, true));

    await renderGate();

    expect(
      screen.getByRole('header', { name: 'Page not found' })
    ).toBeOnTheScreen();
    expect(useCurrentAccountMock).toHaveBeenCalledWith(false);
    expect(useEgressMock).not.toHaveBeenCalled();
  });
});
