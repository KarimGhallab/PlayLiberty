import { describe, expect, it } from '@jest/globals';

import { MAX_CONTENT_WIDTH, contentColumn } from './contentColumn';

describe('the content column', () => {
  it('is the window below the cap', () => {
    expect(contentColumn(411, 0, 0)).toEqual({ width: 411, left: 0 });
    expect(contentColumn(600, 0, 0)).toEqual({ width: 600, left: 0 });
  });

  it('caps a wider window and centres it', () => {
    expect(contentColumn(800, 0, 0)).toEqual({
      width: MAX_CONTENT_WIDTH,
      left: (800 - MAX_CONTENT_WIDTH) / 2
    });
  });

  it('centres inside the safe insets', () => {
    expect(contentColumn(800, 24, 0)).toEqual({
      width: MAX_CONTENT_WIDTH,
      left: 24 + (800 - 24 - MAX_CONTENT_WIDTH) / 2
    });
  });

  it('never exceeds the window', () => {
    expect(contentColumn(320, 0, 0).width).toBe(320);
  });
});
