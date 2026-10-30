import { describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  within
} from '@testing-library/react-native';

import { type Account, UserRole } from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import { touchTarget } from '../../styles/tokens';
import LibraryHeader, { type LibraryHeaderProps } from './LibraryHeader';

const store = { getItem: () => null, setItem: () => {} };

const account: Account = {
  id: 'account-1',
  displayName: 'Milloser',
  email: 'milloser@example.test',
  avatarUrl: null,
  role: UserRole.User
};

async function renderHeader(overrides: Partial<LibraryHeaderProps> = {}) {
  const onOpenAccount = jest.fn();
  const onOpenEgress = jest.fn();
  const props: LibraryHeaderProps = {
    account,
    isAdmin: false,
    sync: { count: 0, busy: false, onPress: jest.fn() },
    onOpenAccount,
    onOpenEgress,
    ...overrides
  };

  await render(
    <I18nProvider initialLanguage={Language.English} storage={store}>
      <LibraryHeader {...props} />
    </I18nProvider>
  );

  return {
    onOpenAccount,
    onOpenEgress,
    onSyncAll: props.sync.onPress
  };
}

describe('the library header', () => {
  it('names the app as its heading', async () => {
    await renderHeader();

    expect(
      screen.getByRole('header', { name: 'PlayLiberty' })
    ).toBeOnTheScreen();
  });

  it('offers one named door to the account that meets the touch target', async () => {
    const { onOpenAccount } = await renderHeader();

    const door = screen.getByRole('button', { name: 'Account' });

    expect(door).toHaveStyle({
      minHeight: touchTarget,
      minWidth: touchTarget
    });

    fireEvent.press(door);
    expect(onOpenAccount).toHaveBeenCalledTimes(1);
  });

  it('draws the account as its avatar door', async () => {
    await renderHeader();

    expect(
      within(screen.getByTestId('account-door')).getByTestId('account-monogram')
    ).toBeOnTheScreen();
  });

  it('offers the egress console to an admin', async () => {
    const { onOpenEgress } = await renderHeader({ isAdmin: true });

    fireEvent.press(screen.getByRole('button', { name: 'VPN settings' }));

    expect(onOpenEgress).toHaveBeenCalledTimes(1);
  });

  it('hides the egress console from a normal account', async () => {
    await renderHeader();

    expect(
      screen.queryByRole('button', { name: 'VPN settings' })
    ).not.toBeOnTheScreen();
  });

  it('names the bulk sync count and hands over the press', async () => {
    const { onSyncAll } = await renderHeader({
      sync: { count: 3, busy: false, onPress: jest.fn() }
    });

    fireEvent.press(
      screen.getByRole('button', { name: 'Sync all 3 playlists' })
    );

    expect(onSyncAll).toHaveBeenCalledTimes(1);
  });

  it('draws no bulk sync when nothing is syncable', async () => {
    await renderHeader();

    expect(screen.queryByTestId('bulk-sync')).not.toBeOnTheScreen();
  });

  it('holds the frozen count and reports work while the batch runs', async () => {
    await renderHeader({
      sync: { count: 3, busy: true, onPress: jest.fn() }
    });

    const control = screen.getByRole('button', {
      name: 'Syncing 3 playlists...'
    });

    expect(control).toBeDisabled();
    expect(control.props.accessibilityState).toEqual({
      disabled: true,
      busy: true
    });
  });
});
