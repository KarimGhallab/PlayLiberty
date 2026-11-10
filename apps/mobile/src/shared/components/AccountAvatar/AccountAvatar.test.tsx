import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { type Account, UserRole } from '@playliberty/contracts';

import AccountAvatar from './AccountAvatar';

const account: Account = {
  id: 'account-1',
  displayName: 'Milloser',
  email: 'milloser@example.test',
  avatarUrl: null,
  role: UserRole.User
};

const hidden = { includeHiddenElements: true };

describe('the account avatar', () => {
  it('draws the avatar image when the account has one', async () => {
    await render(
      <AccountAvatar
        account={{
          ...account,
          avatarUrl: 'https://example.test/avatar.png'
        }}
      />
    );

    expect(screen.getByTestId('account-avatar')).toBeOnTheScreen();
    expect(screen.queryByTestId('account-monogram')).not.toBeOnTheScreen();
  });

  it('draws the initial when the account has no avatar', async () => {
    await render(<AccountAvatar account={account} />);

    expect(screen.getByTestId('account-monogram', hidden)).toBeOnTheScreen();
    expect(screen.getByText('M', hidden)).toBeOnTheScreen();
    expect(screen.queryByTestId('account-avatar')).not.toBeOnTheScreen();
  });

  it('keeps the monogram out of the accessibility tree', async () => {
    await render(<AccountAvatar account={account} />);

    expect(
      screen.getByTestId('account-monogram', hidden).props
        .importantForAccessibility
    ).toBe('no-hide-descendants');
    expect(screen.queryByText('M')).not.toBeOnTheScreen();
  });
});
