import { describe, expect, it } from '@jest/globals';

import { tokenColor, tokenLength, tokenNumber, touchTarget } from './tokens';

describe('the style helpers', () => {
  it('reads a colour token', () => {
    expect(tokenColor('bg')).toBe('#0b0d10');
  });

  it('reads a length token', () => {
    expect(tokenLength('space-4')).toBe(16);
  });

  it('reads a number token', () => {
    expect(tokenNumber('leading-normal')).toBe(1.35);
  });

  it('names the touch target', () => {
    expect(touchTarget).toBe(44);
  });
});
