/*
 * The contracts for the design values.
 *
 * Consumers import types from here and never from the implementation files, so
 * importing a type does not drag the runtime module into the dependency graph.
 */

/** The kind of CSS value a token holds, which decides how the emitter renders it. */
export enum TokenKind {
  Color = 'color',
  Length = 'length',
  Duration = 'duration',
  Number = 'number',
  Family = 'family',
  Curve = 'curve'
}

/** A CSS easing curve as its four `cubic-bezier` control numbers, in order. */
export type EasingCurve = readonly [number, number, number, number];

export interface ColorToken {
  readonly kind: TokenKind.Color;
  readonly value: string;
}

export interface LengthToken {
  readonly kind: TokenKind.Length;
  readonly value: number;
}

export interface DurationToken {
  readonly kind: TokenKind.Duration;
  readonly value: number;
}

export interface NumberToken {
  readonly kind: TokenKind.Number;
  readonly value: number;
}

export interface FamilyToken {
  readonly kind: TokenKind.Family;
  readonly value: string;
}

export interface CurveToken {
  readonly kind: TokenKind.Curve;
  readonly value: EasingCurve;
}

export type Token =
  | ColorToken
  | LengthToken
  | DurationToken
  | NumberToken
  | FamilyToken
  | CurveToken;

export type TokenGroup = readonly [
  name: string,
  tokens: Readonly<Record<string, Token>>
];

/** One frame of the play to pause morph, on the icon set's 24 unit grid. */
export interface MorphFrame {
  readonly index: number;
  /** True when the frame is one of the two pinned endpoints, drawn verbatim. */
  readonly exact: boolean;
  readonly paths: readonly string[];
}

export interface MorphEndpoints {
  readonly play: string;
  readonly pause: string;
}

/**
 * The play to pause geometry. Both clients draw one frame at a time from this
 * table; only the table and the frame count are shared.
 */
export interface Morph {
  readonly name: string;
  readonly frames: number;
  /** The morph runs over this duration, the value of the `motion-base` token. */
  readonly durationMs: number;
  readonly pin: string;
  readonly endpoints: MorphEndpoints;
  readonly stripTravel: number;
  readonly table: readonly MorphFrame[];
}
