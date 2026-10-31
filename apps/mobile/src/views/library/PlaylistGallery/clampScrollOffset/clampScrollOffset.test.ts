import { describe, expect, it } from '@jest/globals';

import { clampScrollOffset } from './clampScrollOffset';

describe('clamping the pinned row', () => {
  it('returns to the start when the remaining cards fit', () => {
    expect(clampScrollOffset(142, 312, 360)).toBe(0);
  });

  it('keeps an offset inside a row that still overflows', () => {
    expect(clampScrollOffset(80, 700, 360)).toBe(80);
  });

  it('pulls an offset back to the shrinking content end', () => {
    expect(clampScrollOffset(600, 500, 360)).toBe(140);
  });

  it('never returns a negative offset', () => {
    expect(clampScrollOffset(-10, 100, 360)).toBe(0);
  });
});
