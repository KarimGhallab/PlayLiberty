import { describe, expect, it } from 'vitest';

import { coverCropQuery, ownerNameFrom } from './queries';

describe('coverCropQuery', () => {
  it('sends no field for the centered default', () => {
    expect(coverCropQuery(null)).toBeUndefined();
  });

  it('sends the four fractions of the visible square', () => {
    expect(
      coverCropQuery({ x: 1 / 3, y: 0, width: 1 / 3, height: 1 })?.toString()
    ).toBe(
      'cropX=0.333333&cropY=0.000000&cropWidth=0.333333&cropHeight=1.000000'
    );
  });
});

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
