import { describe, expect, it } from '@jest/globals';

import { nextAccountsPageParam } from './useAccountPage';

describe('the account directory page walk', () => {
  it('asks for the offset where the loaded rows end', () => {
    expect(
      nextAccountsPageParam({
        offset: 0,
        total: 120,
        items: new Array(50).fill(null)
      })
    ).toBe(50);
  });

  it('continues from the last page offset', () => {
    expect(
      nextAccountsPageParam({
        offset: 50,
        total: 120,
        items: new Array(50).fill(null)
      })
    ).toBe(100);
  });

  it('stops when the loaded rows reach the total', () => {
    expect(
      nextAccountsPageParam({
        offset: 100,
        total: 120,
        items: new Array(20).fill(null)
      })
    ).toBeUndefined();
  });

  it('stops on an empty page even when the total disagrees', () => {
    expect(
      nextAccountsPageParam({ offset: 0, total: 120, items: [] })
    ).toBeUndefined();
  });
});
