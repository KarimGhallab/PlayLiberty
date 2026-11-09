import {
  colors,
  durations,
  families,
  lengths,
  numbers
} from '@playliberty/tokens';

/* The token module is unitless; this is the one place a token becomes a style
 * value, so a screen never reads `values.ts` and never copies a number. */

export function tokenColor(name: keyof typeof colors): string {
  return colors[name].value;
}

export function tokenLength(name: keyof typeof lengths): number {
  return lengths[name].value;
}

export function tokenNumber(name: keyof typeof numbers): number {
  return numbers[name].value;
}

/** The one place a weight token becomes React Native's string weight. */
export function tokenWeight(
  name: 'weight-regular' | 'weight-medium' | 'weight-semibold'
): '400' | '500' | '600' {
  return `${numbers[name].value}` as '400' | '500' | '600';
}

export function tokenDuration(name: keyof typeof durations): number {
  return durations[name].value;
}

export const fontFamily = families['font-ui'].value;

/** Every touch target owes this box, whatever it draws. */
export const touchTarget = tokenLength('control-touch-android');

/** The header's cover ground: faint enough that the failed word on it clears 4.5:1. */
export const coverGroundOpacity = 0.07;

/* The bar's cover veil: the image, then the scrim over it. */
export const barVeilOpacity = 0.45;
export const barScrimOpacity = 0.5;
