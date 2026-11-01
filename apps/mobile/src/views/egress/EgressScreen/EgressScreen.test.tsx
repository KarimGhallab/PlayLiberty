import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { EgressConfig, EgressRead } from '@playliberty/contracts';
import { EgressStatus } from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import { ApiError } from '../../../api/apiClient/ApiClient';
import {
  useCheckEgress,
  useEgress,
  useSwitchEgress
} from '../../../api/useEgress';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import EgressScreen from './EgressScreen';

jest.mock('../../../api/useEgress', () => ({
  useCheckEgress: jest.fn(),
  useEgress: jest.fn(),
  useSwitchEgress: jest.fn()
}));

const useCheckEgressMock = useCheckEgress as jest.MockedFunction<
  typeof useCheckEgress
>;
const useEgressMock = useEgress as jest.MockedFunction<typeof useEgress>;
const useSwitchEgressMock = useSwitchEgress as jest.MockedFunction<
  typeof useSwitchEgress
>;

const store = { getItem: () => null, setItem: () => {} };
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

const TWO_HOURS_AGO = new Date(
  Date.now() - 2 * 60 * 60 * 1000 - 60 * 1000
).toISOString();

const ACTIVE: EgressConfig = {
  name: '01-FR-634',
  endpoint: '185.0.0.1:51820',
  status: EgressStatus.Ok,
  active: true,
  lastAttemptAt: TWO_HOURS_AGO,
  lastCheckAt: null,
  lastExitIp: null,
  lastError: null
};

const STANDBY: EgressConfig = {
  name: '02-CH-182',
  endpoint: null,
  status: EgressStatus.Unknown,
  active: false,
  lastAttemptAt: null,
  lastCheckAt: null,
  lastExitIp: null,
  lastError: null
};

const READ: EgressRead = {
  agentReachable: true,
  configs: [ACTIVE, STANDBY]
};

const SWITCHED: EgressRead = {
  agentReachable: true,
  configs: [
    { ...ACTIVE, active: false },
    { ...STANDBY, active: true }
  ]
};

function success(data: EgressRead, refetch = jest.fn()) {
  return {
    data,
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    isRefetching: false,
    error: null,
    refetch
  } as never;
}

function pending() {
  return {
    data: undefined,
    isPending: true,
    isError: false,
    isSuccess: false,
    isFetching: true,
    isRefetching: false,
    error: null,
    refetch: jest.fn()
  } as never;
}

function failed(refetch = jest.fn()) {
  return {
    data: undefined,
    isPending: false,
    isError: true,
    isSuccess: false,
    isFetching: false,
    isRefetching: false,
    error: new Error('offline'),
    refetch
  } as never;
}

function mutationResult(overrides: Record<string, unknown> = {}) {
  return {
    mutate: jest.fn(),
    isPending: false,
    variables: undefined as string | undefined,
    error: null,
    ...overrides
  };
}

let switchExit = mutationResult();
let check = mutationResult();

interface MutateOptions {
  readonly onSuccess: (read: EgressRead) => void;
  readonly onError: (error: Error) => void;
}

function mutateCall(mutate: jest.Mock): {
  variables: unknown;
  options: MutateOptions;
} {
  const [variables, options] = mutate.mock.calls[0] as [unknown, MutateOptions];

  return { variables, options };
}

function renderScreen(result: unknown) {
  useEgressMock.mockReturnValue(result as never);
  useSwitchEgressMock.mockReturnValue(switchExit as never);
  useCheckEgressMock.mockReturnValue(check as never);

  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <EgressScreen />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  usePlayerStore.getState().clear();
  switchExit = mutationResult();
  check = mutationResult();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('the egress console', () => {
  it('draws the pool with its agent, facts and active mark', async () => {
    await renderScreen(success(READ));

    expect(screen.getByText('Egress agent reachable.')).toBeOnTheScreen();
    expect(screen.getByText('01-FR-634')).toBeOnTheScreen();
    expect(screen.getByText('185.0.0.1:51820')).toBeOnTheScreen();
    expect(screen.getByText('OK')).toBeOnTheScreen();
    expect(screen.getByText('Unknown')).toBeOnTheScreen();
    expect(screen.getByText('2 hours ago')).toBeOnTheScreen();
    expect(screen.getByText('Never')).toBeOnTheScreen();
    expect(screen.getByText('France')).toBeOnTheScreen();
    expect(screen.getByText('Switzerland')).toBeOnTheScreen();
    expect(screen.getByText('Active')).toBeOnTheScreen();
    expect(screen.getByTestId('egress-active-01-FR-634')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('egress-active-02-CH-182')
    ).not.toBeOnTheScreen();
  });

  it('falls back to the country code when the runtime cannot name it', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'DisplayNames');

    Object.defineProperty(Intl, 'DisplayNames', {
      configurable: true,
      value: undefined
    });

    try {
      await renderScreen(success(READ));

      expect(screen.getByText('CH')).toBeOnTheScreen();
    } finally {
      if (descriptor === undefined) {
        delete (Intl as { DisplayNames?: unknown }).DisplayNames;
      } else {
        Object.defineProperty(Intl, 'DisplayNames', descriptor);
      }
    }
  });

  it('offers Check on the active exit and Switch on a standby', async () => {
    await renderScreen(success(READ));

    expect(
      screen.getByRole('button', { name: 'Check 01-FR-634' })
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Switch 02-CH-182' })
    ).toBeOnTheScreen();
  });

  it('runs the standby switch and reports the new exit', async () => {
    await renderScreen(success(READ));

    await act(async () => {
      fireEvent.press(screen.getByTestId('egress-action-02-CH-182'));
      mutateCall(switchExit.mutate).options.onSuccess(SWITCHED);
    });

    expect(switchExit.mutate).toHaveBeenCalledWith(
      '02-CH-182',
      expect.any(Object)
    );
    expect(screen.getByText('Switched to 02-CH-182.')).toBeOnTheScreen();
    expect(screen.getByText('The exit answered YouTube.')).toBeOnTheScreen();
  });

  it('runs the active exit check and reports the active name', async () => {
    await renderScreen(success(READ));

    await act(async () => {
      fireEvent.press(screen.getByTestId('egress-action-01-FR-634'));
      mutateCall(check.mutate).options.onSuccess(READ);
    });

    expect(check.mutate).toHaveBeenCalledWith(undefined, expect.any(Object));
    expect(screen.getByText('01-FR-634 is active.')).toBeOnTheScreen();
    expect(screen.getByText('The exit answered YouTube.')).toBeOnTheScreen();
  });

  it('keeps the pressed card busy and disables the other actions', async () => {
    switchExit = mutationResult({
      isPending: true,
      variables: '02-CH-182'
    });

    await renderScreen(success(READ));

    const switching = screen.getByRole('button', {
      name: 'Switch 02-CH-182'
    });
    const checking = screen.getByRole('button', {
      name: 'Check 01-FR-634'
    });

    expect(switching).toHaveTextContent('Switching...');
    expect(switching.props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true
    });
    expect(checking).toHaveTextContent('Check');
    expect(checking.props.accessibilityState).toMatchObject({
      disabled: true,
      busy: false
    });
  });

  it('keeps the active card busy and disables the standby while it checks', async () => {
    check = mutationResult({ isPending: true });

    await renderScreen(success(READ));

    const checking = screen.getByRole('button', {
      name: 'Check 01-FR-634'
    });
    const switching = screen.getByRole('button', {
      name: 'Switch 02-CH-182'
    });

    expect(checking).toHaveTextContent('Checking...');
    expect(checking.props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true
    });
    expect(switching.props.accessibilityState).toMatchObject({
      disabled: true,
      busy: false
    });
  });

  it('reports a refused switch with its detail and leaves the cards as read', async () => {
    await renderScreen(success(READ));

    await act(async () => {
      fireEvent.press(screen.getByTestId('egress-action-02-CH-182'));
      mutateCall(switchExit.mutate).options.onError(
        new ApiError(502, {
          type: 'about:blank',
          title: 'Switch Failed',
          status: 502,
          code: 'egress_switch_failed',
          detail: 'The exit refused.'
        })
      );
    });

    expect(
      screen.getByText('The exit could not be switched.')
    ).toBeOnTheScreen();
    expect(screen.getByText('The exit refused.')).toBeOnTheScreen();
    expect(screen.getByTestId('egress-active-01-FR-634')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('egress-active-02-CH-182')
    ).not.toBeOnTheScreen();
  });

  it('treats an unreachable agent as a failure', async () => {
    await renderScreen(success(READ));

    await act(async () => {
      fireEvent.press(screen.getByTestId('egress-action-02-CH-182'));
      mutateCall(switchExit.mutate).options.onSuccess({
        ...READ,
        agentReachable: false
      });
    });

    expect(
      screen.getByText('The exit could not be switched.')
    ).toBeOnTheScreen();
    expect(
      screen.getByText('The egress agent could not be reached.')
    ).toBeOnTheScreen();
    expect(screen.queryByText('Switched to 02-CH-182.')).not.toBeOnTheScreen();
  });

  it('reports an unreachable agent in its own words', async () => {
    await renderScreen(success({ ...READ, agentReachable: false }));

    expect(
      screen.getByText(
        'Egress agent unreachable. The configurations below are the last known states.'
      )
    ).toBeOnTheScreen();
  });

  it('draws the loading state while the pool is read', async () => {
    await renderScreen(pending());

    expect(screen.getByText('Loading the configurations.')).toBeOnTheScreen();
  });

  it('explains a failed read and retries it', async () => {
    const refetch = jest.fn();

    await renderScreen(failed(refetch));

    expect(
      screen.getByText('The configurations could not be loaded.')
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('read-failure-retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('says an empty pool and pulls to refresh it', async () => {
    const refetch = jest.fn();

    await renderScreen(success({ agentReachable: true, configs: [] }, refetch));

    expect(
      screen.getByText('No configuration is installed.')
    ).toBeOnTheScreen();
    const control = screen.getByTestId('egress-scroll').props.refreshControl;
    control.props.onRefresh();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
