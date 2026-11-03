/*
 * Lengths and durations are unitless here; the emitter is the only place a unit
 * is added. `tone-downloading` and `emphasis` hold the same amber on purpose:
 * two names for two decisions, not one token aliasing another.
 */
import type {
  ColorToken,
  CurveToken,
  DurationToken,
  FamilyToken,
  LengthToken,
  NumberToken,
  TokenGroup
} from './types.js';
import { TokenKind } from './types.js';

export const colors = {
  bg: { kind: TokenKind.Color, value: '#0b0d10' },
  surface: { kind: TokenKind.Color, value: '#14171b' },
  'surface-raised': { kind: TokenKind.Color, value: '#1c2025' },
  ink: { kind: TokenKind.Color, value: '#e6e9ea' },
  muted: { kind: TokenKind.Color, value: '#8b9299' },
  line: { kind: TokenKind.Color, value: 'rgba(255, 255, 255, 0.09)' },
  accent: { kind: TokenKind.Color, value: '#2f9e7e' },
  'tone-pending': { kind: TokenKind.Color, value: '#84948a' },
  'tone-downloading': { kind: TokenKind.Color, value: '#e39a3c' },
  'tone-stored': { kind: TokenKind.Color, value: '#e6e9ea' },
  'tone-failed': { kind: TokenKind.Color, value: '#e0625e' },
  'tone-unavailable': { kind: TokenKind.Color, value: '#b87570' },
  'tone-removed': { kind: TokenKind.Color, value: '#8b9299' },
  'control-border': { kind: TokenKind.Color, value: '#6e7379' },
  'accent-hover': { kind: TokenKind.Color, value: '#4cac90' },

  'muted-on-art': { kind: TokenKind.Color, value: '#c2c7cb' },
  'accent-on-art': { kind: TokenKind.Color, value: '#7fd9b6' },

  'current-surface': { kind: TokenKind.Color, value: '#13211f' },
  emphasis: { kind: TokenKind.Color, value: '#e39a3c' },

  /* The shared role: a sky that names anything about sharing, a quiet shade for
   * the card marks, and a surface and boundary for the gallery's shared scope. */
  shared: { kind: TokenKind.Color, value: '#649fcb' },
  'shared-quiet': { kind: TokenKind.Color, value: '#698ba5' },
  'shared-surface': { kind: TokenKind.Color, value: '#132b3d' },
  'shared-border': { kind: TokenKind.Color, value: '#44779c' },
  'shared-muted': { kind: TokenKind.Color, value: '#87adcb' },

  /* The egress role: the operator's tunnel and its pool. Kept off the accent,
   * so an operator control is not read as a playback or sharing action. */
  egress: { kind: TokenKind.Color, value: '#a78bfa' },
  'egress-muted': { kind: TokenKind.Color, value: '#8f7bc4' },
  'egress-surface': { kind: TokenKind.Color, value: '#241d33' },
  'egress-border': { kind: TokenKind.Color, value: '#7a63b0' },

  'control-disabled-fg': { kind: TokenKind.Color, value: '#888b8d' },
  'control-disabled-bg': { kind: TokenKind.Color, value: '#1e2229' },
  scrim: { kind: TokenKind.Color, value: 'rgb(0 0 0 / 0.6)' },

  /* The six sleeve tints, all at OKLCH L 0.34 C 0.055, so they read as one
   * family. The arc skips the accent and state hues, so a sleeve is not one. */
  'sleeve-1': { kind: TokenKind.Color, value: '#08413e' },
  'sleeve-2': { kind: TokenKind.Color, value: '#0d3e4c' },
  'sleeve-3': { kind: TokenKind.Color, value: '#213a53' },
  'sleeve-4': { kind: TokenKind.Color, value: '#353453' },
  'sleeve-5': { kind: TokenKind.Color, value: '#432f4c' },
  'sleeve-6': { kind: TokenKind.Color, value: '#4c2c3e' }
} as const satisfies Record<string, ColorToken>;

export const lengths = {
  'text-xs': { kind: TokenKind.Length, value: 12 },
  'text-sm': { kind: TokenKind.Length, value: 14 },
  'text-md': { kind: TokenKind.Length, value: 16 },
  'text-lg': { kind: TokenKind.Length, value: 20 },
  'text-xl': { kind: TokenKind.Length, value: 24 },
  'text-2xl': { kind: TokenKind.Length, value: 32 },
  'space-1': { kind: TokenKind.Length, value: 4 },
  'space-2': { kind: TokenKind.Length, value: 8 },
  'space-3': { kind: TokenKind.Length, value: 12 },
  'space-4': { kind: TokenKind.Length, value: 16 },
  'space-5': { kind: TokenKind.Length, value: 20 },
  'space-6': { kind: TokenKind.Length, value: 24 },
  'space-7': { kind: TokenKind.Length, value: 32 },
  'space-8': { kind: TokenKind.Length, value: 40 },
  'space-9': { kind: TokenKind.Length, value: 48 },
  'radius-artwork': { kind: TokenKind.Length, value: 4 },
  'radius-control': { kind: TokenKind.Length, value: 6 },
  'radius-card': { kind: TokenKind.Length, value: 10 },
  'radius-chip': { kind: TokenKind.Length, value: 999 },
  'control-height': { kind: TokenKind.Length, value: 36 },
  'control-touch': { kind: TokenKind.Length, value: 44 },
  'control-size-check': { kind: TokenKind.Length, value: 18 },
  'control-size-inline': { kind: TokenKind.Length, value: 28 },
  'player-bar-height': { kind: TokenKind.Length, value: 98 },
  'icon-sm': { kind: TokenKind.Length, value: 16 },
  'icon-md': { kind: TokenKind.Length, value: 20 },
  'icon-lg': { kind: TokenKind.Length, value: 28 },
  'focus-width': { kind: TokenKind.Length, value: 2 },
  'focus-offset': { kind: TokenKind.Length, value: 2 }
} as const satisfies Record<string, LengthToken>;

/** A decorative loop keeps the `ease-in-out` keyword. */
export const durations = {
  'motion-fast': { kind: TokenKind.Duration, value: 120 },
  'motion-base': { kind: TokenKind.Duration, value: 180 },
  'motion-slow': { kind: TokenKind.Duration, value: 240 }
} as const satisfies Record<string, DurationToken>;

export const numbers = {
  'weight-regular': { kind: TokenKind.Number, value: 400 },
  'weight-medium': { kind: TokenKind.Number, value: 500 },
  'weight-semibold': { kind: TokenKind.Number, value: 600 },
  'leading-tight': { kind: TokenKind.Number, value: 1.2 },
  'leading-normal': { kind: TokenKind.Number, value: 1.35 },
  'leading-relaxed': { kind: TokenKind.Number, value: 1.5 },
  'opacity-disabled': { kind: TokenKind.Number, value: 0.45 },
  'z-base': { kind: TokenKind.Number, value: 0 },
  'z-sticky': { kind: TokenKind.Number, value: 10 },
  'z-player': { kind: TokenKind.Number, value: 20 },
  'z-overlay': { kind: TokenKind.Number, value: 30 }
} as const satisfies Record<string, NumberToken>;

/** The family name alone: the fallback stack is the client's. */
export const families = {
  'font-ui': { kind: TokenKind.Family, value: 'IBM Plex Sans' }
} as const satisfies Record<string, FamilyToken>;

/** Outside the `motion-*` family: a curve is not a duration. */
export const curves = {
  'ease-standard': { kind: TokenKind.Curve, value: [0.4, 0, 0.2, 1] }
} as const satisfies Record<string, CurveToken>;

/* Every group the emitter writes, in output order. The morph is not here: it is
 * geometry a client draws, not a custom property. */
export const tokenGroups: readonly TokenGroup[] = [
  ['colors', colors],
  ['lengths', lengths],
  ['durations', durations],
  ['numbers', numbers],
  ['families', families],
  ['curves', curves]
];
