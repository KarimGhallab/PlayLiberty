import { Platform, useWindowDimensions } from 'react-native';

import { tokenLength, tokenNumber } from './tokens';

type TextSize =
  'text-xs' | 'text-sm' | 'text-md' | 'text-lg' | 'text-xl' | 'text-2xl';
type Leading = 'leading-tight' | 'leading-normal' | 'leading-relaxed';

/**
 * The system text scale, capped where a fixed layout would break. The cap is
 * passed to the font as `maxFontSizeMultiplier`.
 */
export function useTextScale(cap: number = Infinity): number {
  const { fontScale } = useWindowDimensions();

  return Math.min(fontScale, cap);
}

/**
 * The line box for a token size at that scale: a leading written for 1.0
 * collides once the glyphs grow.
 */
export function lineHeightFor(
  size: TextSize,
  leading: Leading,
  scale: number
): number {
  /* iOS applies the multiplier to a declared lineHeight itself; Android does not. */
  const factor = Platform.OS === 'ios' ? 1 : scale;

  return tokenLength(size) * tokenNumber(leading) * factor;
}

/** The line box a control draws at this scale, for laying out around it. */
export function drawnLineHeight(
  size: TextSize,
  leading: Leading,
  scale: number
): number {
  return tokenLength(size) * tokenNumber(leading) * scale;
}
