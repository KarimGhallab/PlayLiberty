import { describe, expect, it } from '@jest/globals';

import {
  barScrimOpacity,
  barVeilOpacity,
  coverGroundOpacity,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from './tokens';

/* WCAG 2.1 relative luminance, read from the shipped hexes so a token change
 * fails the suite. */
function channel(hex: string, index: number): number {
  return parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
}

function luminance(hex: string): number {
  const [red, green, blue] = [0, 1, 2].map(index => {
    const value = channel(hex, index);

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

function contrast(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);

  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** One colour at an opacity over another, as the surfaces composite them. */
function over(foreground: string, background: string, opacity: number): string {
  const mix = [0, 1, 2].map(index =>
    Math.round(
      255 *
        (channel(foreground, index) * opacity +
          channel(background, index) * (1 - opacity))
    )
  );

  return `#${mix.map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

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

describe('the text over artwork', () => {
  /* The brightest possible cover over every base the bar can draw, then the
   * scrim: the bar's worst ground. */
  const grounds = (
    [
      'sleeve-1',
      'sleeve-2',
      'sleeve-3',
      'sleeve-4',
      'sleeve-5',
      'sleeve-6',
      'surface-raised'
    ] as const
  ).map(base => {
    const veiled = over('#ffffff', tokenColor(base), barVeilOpacity);

    return over(veiled, tokenColor('bg'), barScrimOpacity);
  });

  it('reads the bar on its cover ground', () => {
    for (const ground of grounds) {
      expect(
        contrast(tokenColor('muted-on-art'), ground)
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(tokenColor('accent-on-art'), ground)
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('reads the failed word on the header ground', () => {
    /* The brightest possible cover, at the strength the header draws it. */
    const ground = over('#ffffff', tokenColor('bg'), coverGroundOpacity);

    expect(contrast(tokenColor('tone-failed'), ground)).toBeGreaterThanOrEqual(
      4.5
    );
  });
});
