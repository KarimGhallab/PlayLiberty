/*
 * The designed values, the single source of truth.
 *
 * Transcribed from `docs/design/tokens.css` by task 10; the design records in
 * `docs/DESIGN.md` and `docs/design-system/` carry the reasoning behind each
 * one. Lengths and durations are unitless numbers here, and the emitter in
 * `emitTokens.ts` is the only place a unit is ever added.
 *
 * Two tokens hold the same literal on purpose, and the design's validator keeps
 * them honest: `tone-downloading` and `emphasis` are both the amber. They are
 * two names for two decisions, not one token aliasing another.
 *
 * A font token is the family name alone. The fallback stack is the client's,
 * because React Native takes one family name and cannot parse a CSS stack; the
 * emitter quotes it for the stylesheet.
 */
import { TokenKind } from './types.js';
import type {
  ColorToken,
  CurveToken,
  DurationToken,
  FamilyToken,
  LengthToken,
  NumberToken,
  TokenGroup
} from './types.js';

/**
 * Surfaces, text, the accent, the six state tones, the control colours and the
 * six sleeve hues.
 */
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
  emphasis: { kind: TokenKind.Color, value: '#e39a3c' },
  'control-disabled-fg': { kind: TokenKind.Color, value: '#888b8d' },
  'control-disabled-bg': { kind: TokenKind.Color, value: '#1e2229' },
  scrim: { kind: TokenKind.Color, value: 'rgb(0 0 0 / 0.6)' },

  /*
   * The six sleeve hues. A playlist with no `coverUrl` draws its identity as a
   * sleeve instead of the anonymous grey hatch, and the hue is one of these
   * rather than one computed at run time: every value is drawn at OKLCH L 0.34,
   * C 0.055, so the six read as one family of dark tinted sleeves rather than a
   * second accent. The arc runs teal to plum and deliberately skips the accent's
   * green and the amber and red the states own, so a sleeve is never read as a
   * state. `sleeveIndex` in `@playliberty/ui-foundation` picks one from the
   * playlist id.
   */
  'sleeve-1': { kind: TokenKind.Color, value: '#08413e' },
  'sleeve-2': { kind: TokenKind.Color, value: '#0d3e4c' },
  'sleeve-3': { kind: TokenKind.Color, value: '#213a53' },
  'sleeve-4': { kind: TokenKind.Color, value: '#353453' },
  'sleeve-5': { kind: TokenKind.Color, value: '#432f4c' },
  'sleeve-6': { kind: TokenKind.Color, value: '#4c2c3e' }
} as const satisfies Record<string, ColorToken>;

/** The type scale, spacing, shape, control geometry, icons and the focus ring. */
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
  'icon-sm': { kind: TokenKind.Length, value: 16 },
  'icon-md': { kind: TokenKind.Length, value: 20 },
  'icon-lg': { kind: TokenKind.Length, value: 28 },
  'focus-width': { kind: TokenKind.Length, value: 2 },
  'focus-offset': { kind: TokenKind.Length, value: 2 }
} as const satisfies Record<string, LengthToken>;

/** The three transitions. A decorative loop keeps the `ease-in-out` keyword. */
export const durations = {
  'motion-fast': { kind: TokenKind.Duration, value: 120 },
  'motion-base': { kind: TokenKind.Duration, value: 180 },
  'motion-slow': { kind: TokenKind.Duration, value: 240 }
} as const satisfies Record<string, DurationToken>;

/** Weights, leading ratios, opacity and the stacking order. */
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
  'z-overlay': { kind: TokenKind.Number, value: 20 },
  'z-player': { kind: TokenKind.Number, value: 30 }
} as const satisfies Record<string, NumberToken>;

/** One family for the whole product. The emitter quotes it for the stylesheet. */
export const families = {
  'font-ui': { kind: TokenKind.Family, value: 'IBM Plex Sans' }
} as const satisfies Record<string, FamilyToken>;

/** The only curve in the system. It sits outside the `motion-*` family. */
export const curves = {
  'ease-standard': { kind: TokenKind.Curve, value: [0.4, 0, 0.2, 1] }
} as const satisfies Record<string, CurveToken>;

/**
 * Every group the emitter writes into the stylesheet, in output order. The
 * morph is not here: it is geometry a client draws, not a custom property.
 */
export const tokenGroups: readonly TokenGroup[] = [
  ['colors', colors],
  ['lengths', lengths],
  ['durations', durations],
  ['numbers', numbers],
  ['families', families],
  ['curves', curves]
];
