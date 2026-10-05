import { describe, expect, it } from 'vitest';

import { sleeveIndex } from './sleeve.js';

describe('sleeveIndex', () => {
  it('always names one of the six sleeves the token set declares', () => {
    const ids = [
      '',
      'a',
      'playlist-1',
      '8f6b2f4e-1c3a-4b5d-9e7f-0a1b2c3d4e5f',
      'A playlist with a very long name and spaces',
      '0',
      '99999999999999999999999999999999999999999'
    ];

    for (const id of ids) {
      const index = sleeveIndex(id);

      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(1);
      expect(index).toBeLessThanOrEqual(6);
    }
  });

  it('is deterministic, so a playlist keeps its sleeve', () => {
    const id = 'playlist-1';

    expect(sleeveIndex(id)).toBe(sleeveIndex(id));
  });

  it('spreads ids across every sleeve rather than piling on one', () => {
    const seen = new Set<number>();

    for (let index = 0; index < 200; index += 1) {
      seen.add(sleeveIndex(`playlist-${index}`));
    }

    expect(seen.size).toBe(6);
  });
});
