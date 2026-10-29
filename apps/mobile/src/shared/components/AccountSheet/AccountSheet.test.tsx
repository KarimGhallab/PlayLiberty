import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { type Account, UserRole } from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import AccountSheet, { type AccountSheetProps } from './AccountSheet';

const store = { getItem: () => null, setItem: () => {} };

const account: Account = {
  id: 'account-1',
  displayName: 'Milloser',
  email: 'milloser@example.test',
  avatarUrl: null,
  role: UserRole.User
};

async function renderSheet(overrides: Partial<AccountSheetProps> = {}) {
  const props: AccountSheetProps = {
    visible: true,
    account,
    failure: null,
    onClose: jest.fn(),
    onSignOut: jest.fn(),
    onOpenEgress: jest.fn(),
    ...overrides
  };

  await render(
    <I18nProvider initialLanguage={Language.English} storage={store}>
      <AccountSheet {...props} />
    </I18nProvider>
  );

  return props;
}

describe('the account sheet', () => {
  it('names the account it belongs to', async () => {
    await renderSheet();

    expect(screen.getByText('Milloser')).toBeOnTheScreen();
  });

  it('draws the avatar only when the account has one', async () => {
    await renderSheet();
    expect(screen.queryByTestId('account-avatar')).not.toBeOnTheScreen();

    await renderSheet({
      account: { ...account, avatarUrl: 'https://example.test/avatar.png' }
    });
    expect(screen.getByTestId('account-avatar')).toBeOnTheScreen();
  });

  it('marks an admin and offers the egress console', async () => {
    const props = await renderSheet({
      account: { ...account, role: UserRole.Admin }
    });

    expect(screen.getByText('Admin')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: 'VPN settings' }));
    expect(props.onOpenEgress).toHaveBeenCalledTimes(1);
  });

  it('offers neither the mark nor the console to a normal account', async () => {
    await renderSheet();

    expect(screen.queryByText('Admin')).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'VPN settings' })
    ).not.toBeOnTheScreen();
  });

  it('signs out', async () => {
    const props = await renderSheet();

    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    expect(props.onSignOut).toHaveBeenCalledTimes(1);
  });

  it('shows the refusal in place of nothing', async () => {
    await renderSheet({ failure: 'The account could not be read.' });

    expect(
      screen.getByText('The account could not be read.')
    ).toBeOnTheScreen();
  });
});
