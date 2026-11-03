import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { type Account, UserRole } from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import { tokenLength } from '../../styles/tokens';
import AccountSheet, { type AccountSheetProps } from './AccountSheet';

const store = { getItem: () => null, setItem: () => {} };

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

afterEach(() => {
  jest.restoreAllMocks();
});

const account: Account = {
  id: 'account-1',
  displayName: 'Milloser',
  email: 'milloser@example.test',
  avatarUrl: null,
  role: UserRole.User
};

async function renderSheet(
  overrides: Partial<AccountSheetProps> = {},
  language = Language.English
) {
  const props: AccountSheetProps = {
    visible: true,
    account,
    loading: false,
    failure: null,
    onClose: jest.fn(),
    onSignOut: jest.fn(),
    ...overrides
  };

  const view = await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={language} storage={store}>
        <AccountSheet {...props} />
      </I18nProvider>
    </SafeAreaProvider>
  );

  return { props, view };
}

describe('the account sheet', () => {
  it('names the account it belongs to', async () => {
    await renderSheet();

    expect(screen.getByText('Milloser')).toBeOnTheScreen();
  });

  it('holds the identity block while the account is read', async () => {
    await renderSheet({ account: null, loading: true });

    expect(screen.getByLabelText('Loading the account.')).toBeOnTheScreen();
    expect(screen.getByTestId('account-identity-loading')).toHaveStyle({
      minHeight: tokenLength('space-9')
    });
    expect(screen.getByRole('radio', { name: 'English' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeOnTheScreen();
  });

  it('draws no identity block once the read has failed', async () => {
    await renderSheet({ account: null, loading: false });

    expect(
      screen.queryByLabelText('Loading the account.')
    ).not.toBeOnTheScreen();
  });

  it('draws the avatar only when the account has one', async () => {
    await renderSheet();
    expect(screen.queryByTestId('account-avatar')).not.toBeOnTheScreen();

    await renderSheet({
      account: { ...account, avatarUrl: 'https://example.test/avatar.png' }
    });
    expect(screen.getByTestId('account-avatar')).toBeOnTheScreen();
  });

  it('marks an admin', async () => {
    await renderSheet({ account: { ...account, role: UserRole.Admin } });

    expect(screen.getByText('Admin')).toBeOnTheScreen();
  });

  it('does not mark a normal account', async () => {
    await renderSheet();

    expect(screen.queryByText('Admin')).not.toBeOnTheScreen();
  });

  it('draws the account initial when it has no avatar', async () => {
    await renderSheet();

    expect(
      screen.getByText('M', { includeHiddenElements: true })
    ).toBeOnTheScreen();
  });

  it('names its heading', async () => {
    await renderSheet();

    expect(screen.getByRole('header', { name: 'Account' })).toBeOnTheScreen();
  });

  it('announces the language in force as selected', async () => {
    await renderSheet();

    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Français' })).not.toBeChecked();
  });

  it('does not slide when the system asks for less motion', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    const { view } = await renderSheet();

    await waitFor(() => {
      const [modal] = view.container.queryAll(
        node => 'animationType' in node.props
      );

      expect(modal?.props.animationType).toBe('none');
    });
  });

  it('asks before signing out', async () => {
    const { props } = await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(props.onSignOut).not.toHaveBeenCalled();
    expect(
      screen.getByText('Are you sure you want to sign out?')
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(props.onSignOut).toHaveBeenCalledTimes(1);
  });

  it('disarms the question on cancel', async () => {
    const { props } = await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByText('Are you sure you want to sign out?')
    ).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(props.onSignOut).not.toHaveBeenCalled();
  });

  it('asks in French', async () => {
    const { props } = await renderSheet({}, Language.French);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Se déconnecter' })
    );

    expect(
      screen.getByText('Êtes-vous sur de vouloir vous déconnecter ?')
    ).toBeOnTheScreen();
    expect(props.onSignOut).not.toHaveBeenCalled();
  });

  it('closes when the backdrop is pressed', async () => {
    const { props } = await renderSheet();

    await fireEvent.press(screen.getByTestId('account-backdrop'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the refusal in place of nothing', async () => {
    await renderSheet({ failure: 'The account could not be read.' });

    expect(
      screen.getByText('The account could not be read.')
    ).toBeOnTheScreen();
  });
});
