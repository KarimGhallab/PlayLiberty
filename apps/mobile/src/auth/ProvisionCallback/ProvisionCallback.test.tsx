import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ProblemCode } from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import { touchTarget } from '../../shared/styles/tokens/tokens';

import {
  ProvisioningError,
  ProvisioningFailure,
  completeProvisioning
} from '../provisioning/provisioning';
import { mobileSession } from '../session/session';
import { startProvisioning } from '../startProvisioning';
import ProvisionCallback from './ProvisionCallback';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: jest.fn()
}));

jest.mock('../expoProvisioning', () => ({
  expoProvisioningDeps: {}
}));

jest.mock('../provisioning/provisioning', () => {
  const actual = jest.requireActual<
    typeof import('../provisioning/provisioning')
  >('../provisioning/provisioning');

  return {
    ...actual,
    completeProvisioning: jest.fn()
  };
});

jest.mock('../startProvisioning', () => ({
  startProvisioning: jest.fn()
}));

jest.mock('../session/session', () => ({
  mobileSession: { adopt: jest.fn() }
}));

const complete = jest.mocked(completeProvisioning);
const start = jest.mocked(startProvisioning);
const adopt = jest.mocked(mobileSession.adopt);
const mockReplace = jest.mocked(router.replace);
const mockParams = jest.mocked(useLocalSearchParams);

const store = { getItem: () => null, setItem: () => {} };

/* The door's mark is visual; a still door keeps the test off the clock. */
jest.mock('../../shared/a11y/useReduceMotion/useReduceMotion', () => ({
  useReduceMotion: () => true
}));

function refusal(): ProvisioningError {
  return new ProvisioningError(ProvisioningFailure.Refused, {
    type: 'https://playliberty.dev/problems/invalid_grant',
    title: 'Invalid Grant',
    status: 400,
    code: ProblemCode.InvalidGrant
  });
}

async function renderCallback(
  language: Language = Language.English
): Promise<void> {
  await render(
    <I18nProvider initialLanguage={language} storage={store}>
      <ProvisionCallback />
    </I18nProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.mockReturnValue({ code: 'code-1', state: 'state-1' });
  complete.mockRejectedValue(refusal());
  start.mockResolvedValue(undefined);
});

describe('the provisioning callback', () => {
  it('draws the problem sentence and offers Sign in again', async () => {
    await renderCallback();

    expect(
      await screen.findByText(
        'The sign-in link is no longer valid. Start again.'
      )
    ).toBeOnTheScreen();

    const action = screen.getByRole('button', { name: 'Sign in again' });

    expect(action).toBeEnabled();
    expect(action).toHaveStyle({
      minHeight: touchTarget,
      minWidth: touchTarget
    });

    let release: () => void = () => {};
    start.mockReturnValue(
      new Promise<void>(resolve => {
        release = resolve;
      })
    );

    await fireEvent.press(action);

    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText('The sign-in link is no longer valid. Start again.')
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();

    await act(async () => {
      release();
    });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Sign in again' })
      ).toBeEnabled()
    );
  });

  it('shows the generic sentence for a state mismatch and offers the action', async () => {
    complete.mockRejectedValue(
      new ProvisioningError(ProvisioningFailure.StateMismatch)
    );

    await renderCallback();

    expect(
      await screen.findByText('Sign-in could not finish.')
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Sign in again' })
    ).toBeOnTheScreen();
  });

  it('shows the generic sentence when the callback has no code or state', async () => {
    mockParams.mockReturnValue({});

    await renderCallback();

    expect(
      await screen.findByText('Sign-in could not finish.')
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Sign in again' })
    ).toBeOnTheScreen();
    expect(complete).not.toHaveBeenCalled();
  });

  it('adopts the pair and returns to the library on success', async () => {
    const pair = {
      access: {
        id: 'token-id',
        secret: 'token-secret',
        expires_at: '2026-11-02T00:00:00.000Z',
        expires_in: 43_200
      },
      refresh: {
        token: 'refresh-token',
        expires_at: '2027-04-30T12:00:00.000Z',
        expires_in: 15_552_000
      }
    };
    complete.mockResolvedValue(pair);

    await renderCallback();

    await waitFor(() => {
      expect(adopt).toHaveBeenCalledWith(pair);
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });
});
