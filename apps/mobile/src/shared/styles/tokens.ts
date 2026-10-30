import {
  colors,
  durations,
  families,
  lengths,
  numbers
} from '@playliberty/tokens';

/* The token module is unitless; React Native wants points and colours. This is
 * the one place a token becomes a style value, so a screen never reads
 * `values.ts` and never copies a number. */

export function tokenColor(name: keyof typeof colors): string {
  return colors[name].value;
}

export function tokenLength(name: keyof typeof lengths): number {
  return lengths[name].value;
}

export function tokenNumber(name: keyof typeof numbers): number {
  return numbers[name].value;
}

export function tokenDuration(name: keyof typeof durations): number {
  return durations[name].value;
}

export const fontFamily = families['font-ui'].value;

/** Every touch target owes this box, whatever it draws. */
export const touchTarget = tokenLength('control-touch');
