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

/* For a sentence a `{placeholder}` template cannot carry; the escape hatch, not
 * the default. */
export type MessageFunction = (params: MessageParams) => string;

export type Message = string | PluralMessage | MessageFunction;
