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
    onOpenEgress
  };
}

describe('the library header', () => {
  it('names the app as its heading', async () => {
    await renderHeader();

    expect(
      screen.getByRole('header', { name: 'PlayLiberté' })
    ).toBeOnTheScreen();
  });

  it('offers one named door to the account that meets the touch target', async () => {
    const { onOpenAccount } = await renderHeader();

    const door = screen.getByRole('button', { name: 'Account' });

    expect(door).toHaveStyle({
      minHeight: touchTarget,
      minWidth: touchTarget
    });

    await fireEvent.press(door);
    expect(onOpenAccount).toHaveBeenCalledTimes(1);
  });

  it('draws the account as its avatar door', async () => {
    await renderHeader();

    expect(
      within(screen.getByTestId('account-door')).getByTestId(
        'account-monogram',
        { includeHiddenElements: true }
      )
    ).toBeOnTheScreen();
  });

  it('offers the egress console to an admin', async () => {
    const { onOpenEgress } = await renderHeader({ isAdmin: true });

    await fireEvent.press(screen.getByRole('button', { name: 'VPN settings' }));

    expect(onOpenEgress).toHaveBeenCalledTimes(1);
  });

  it('hides the egress console from a normal account', async () => {
    await renderHeader();

    expect(
      screen.queryByRole('button', { name: 'VPN settings' })
    ).not.toBeOnTheScreen();
  });
});
