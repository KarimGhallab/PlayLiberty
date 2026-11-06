import { describe, expect, it } from '@jest/globals';

import { contentWidth } from '../../../shared/styles/contentColumn/contentColumn';
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
      const box = contentWidth(windowWidth) - inset * 2;

      expect(galleryColumnWidth(windowWidth) * count + gap * (count - 1)).toBe(
        box
      );
    }
  });

  it('keeps the columns inside the capped column on a tablet', () => {
    expect(contentWidth(840)).toBe(720);
    expect(galleryColumnWidth(840) * 3 + gap * 2).toBe(720 - inset * 2);
  });

  it('keeps a 320pt phone at two usable columns', () => {
    expect(galleryColumnCount(320)).toBe(2);
    expect(galleryColumnWidth(320)).toBeGreaterThan(0);
  });

  it('makes a pinned card the grid card and lets the next one peek', () => {
    for (const windowWidth of [320, 390, 411]) {
      expect(galleryPinnedWidth(windowWidth)).toBe(
        galleryColumnWidth(windowWidth)
      );
    }

    /* The row runs one page inset past the content edge; the next card starts
     * a gap beyond it, so that inset is the visible sliver. */
    const card = galleryColumnWidth(411);
    const box = contentWidth(411) - inset * 2;

    expect(card * 2 + gap).toBe(box);
    expect(inset).toBeGreaterThan(gap);
  });
});
