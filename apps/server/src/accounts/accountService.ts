import type { Account } from '@playliberty/contracts';

import type { AuthAccount } from '../auth/types.js';

export function toAccountView(account: AuthAccount): Account {
  return {
    id: account.id,
    displayName: account.displayName,
    email: account.email,
    avatarUrl: account.avatarUrl,
    role: account.role
  };
}
