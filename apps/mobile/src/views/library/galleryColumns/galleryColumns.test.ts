import { describe, expect, it } from '@jest/globals';

import { tokenLength } from '../../../shared/styles/tokens';

import { galleryColumnWidth, galleryPinnedWidth } from './galleryColumns';

const inset = tokenLength('space-4');
const gap = tokenLength('space-3');

describe('the gallery columns', () => {
  it('fills the content box with two columns and one gap', () => {
    for (const windowWidth of [320, 390, 461]) {
      expect(galleryColumnWidth(windowWidth) * 2 + gap).toBe(
        windowWidth - inset * 2
      );
    }
  });

  it('keeps a pinned card under half the row so the next one peeks', () => {
    expect(galleryPinnedWidth(390)).toBeCloseTo((390 - inset * 2 - gap) * 0.45);
    expect(galleryPinnedWidth(390)).toBeLessThan(galleryColumnWidth(390));
  });
});
