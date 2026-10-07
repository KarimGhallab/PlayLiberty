/*
 * The i18n contracts. The runtime, the catalogs and the React binding all speak
 * these, so the shapes live here rather than in any one of them.
 */

/** The languages the interface is available in. */
export enum Language {
  English = 'en',
  French = 'fr'
}

/** The values interpolated into a message, a count among them. */
export interface MessageParams {
  readonly [name: string]: string | number;
}

/** A message that varies with a count, one form per plural category. */
export interface PluralMessage {
  readonly one: string;
  readonly other: string;
}

/*
 * A message built from its parameters, for the rare sentence a template cannot
 * carry. The catalogs prefer a string with `{placeholders}`; a function is the
 * escape hatch, not the default.
 */
export type MessageFunction = (params: MessageParams) => string;

/** A catalog entry: a template, a plural, or a function. */
export type Message = string | PluralMessage | MessageFunction;
