import { describe, expect, it } from '@jest/globals';

import { tokenLength } from '../../../shared/styles/tokens';

import {
  GALLERY_WIDE_BREAKPOINT,
  galleryColumnCount,
  galleryColumnWidth,
  galleryPinnedWidth
} from './galleryColumns';

const inset = tokenLength('space-4');
const gap = tokenLength('space-3');

describe('the gallery columns', () => {
  it('uses two columns below the breakpoint and three at or above it', () => {
    expect(galleryColumnCount(390)).toBe(2);
    expect(galleryColumnCount(GALLERY_WIDE_BREAKPOINT - 1)).toBe(2);
    expect(galleryColumnCount(GALLERY_WIDE_BREAKPOINT)).toBe(3);
    expect(galleryColumnCount(840)).toBe(3);
  });

  it('fills the content box with its columns and gaps', () => {
    for (const windowWidth of [320, 390, 600, 840]) {
      const count = galleryColumnCount(windowWidth);

      expect(galleryColumnWidth(windowWidth) * count + gap * (count - 1)).toBe(
        windowWidth - inset * 2
      );
    }
  });

  it('keeps a 320pt phone at two usable columns', () => {
    expect(galleryColumnCount(320)).toBe(2);
    expect(galleryColumnWidth(320)).toBeGreaterThan(0);
  });

  it('keeps a pinned card under a column so the next one peeks', () => {
    expect(galleryPinnedWidth(390)).toBeCloseTo(galleryColumnWidth(390) * 0.9);
    expect(galleryPinnedWidth(390)).toBeLessThan(galleryColumnWidth(390));
  });
});
