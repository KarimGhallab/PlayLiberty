export enum Language {
  English = 'en',
  French = 'fr'
}

/** The values interpolated into a message, a count among them. */
export interface MessageParams {
  readonly [name: string]: string | number;
}

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

export type Message = string | PluralMessage | MessageFunction;
