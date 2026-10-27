import { describe, expect, it } from 'vitest';

import { ownerNameFrom } from './accountClient';

describe('ownerNameFrom', () => {
  const directory = [
    { id: 'account-1', displayName: 'You', avatarUrl: null },
    { id: 'account-2', displayName: 'Ada', avatarUrl: null }
  ];

  it('resolves an id the directory carries', () => {
    expect(ownerNameFrom(directory, 'account-2')).toBe('Ada');
  });

  it('returns null for an id the directory does not carry', () => {
    expect(ownerNameFrom(directory, 'account-9')).toBeNull();
  });

  it('returns null for an empty directory rather than an empty name', () => {
    expect(ownerNameFrom([], 'account-2')).toBeNull();
  });
});
