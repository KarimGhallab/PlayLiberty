import type {
  MessageFunction,
  MessageParams,
  PluralMessage
} from '../types.js';
import { Language } from '../types.js';

/*
 * The runtime: `t(key, params)` looks the key up in the active catalog and
 * renders it. There is no third-party i18n dependency, because the web client
 * and Hermes must say the same sentence and ICU and `Intl` differ by platform.
 * Interpolation is `{name}` placeholders, and a plural is selected by a small
 * category function rather than ICU.
 */

/**
 * The dotted keys of a catalog, derived from its shape so `t` is typed against
 * the key union and a typo is a compile error.
 */
export type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends string | PluralMessage | MessageFunction
    ? K
    : `${K}.${MessageKey<T[K]>}`;
}[keyof T & string];

/** The translator a catalog yields, keyed to that catalog's shape. */
export type Translator<M> = (
  key: MessageKey<M>,
  params?: MessageParams
) => string;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMessageFunction(value: unknown): value is MessageFunction {
  return typeof value === 'function';
}

function isPlural(value: unknown): value is PluralMessage {
  return (
    isRecord(value) &&
    typeof value.one === 'string' &&
    typeof value.other === 'string'
  );
}

function lookup(catalog: unknown, key: string): unknown {
  let current: unknown = catalog;

  for (const part of key.split('.')) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

function interpolate(template: string, params: MessageParams): string {
  return template.replace(/\{(\w+)\}/g, (match: string, name: string) =>
    name in params ? String(params[name]) : match
  );
}

/*
 * The plural category for a count. English singles out one; French singles out
 * zero and one, so `0 piste` reads right. This is the whole category function,
 * because a catalog carries two forms and no ICU.
 */
function pluralCategory(
  language: Language,
  count: number
): keyof PluralMessage {
  if (language === Language.French) {
    return count <= 1 ? 'one' : 'other';
  }

  return count === 1 ? 'one' : 'other';
}

/** A catalog and a language yield the translator the provider hands out. */
export function createTranslator<M>(
  catalog: M,
  language: Language
): Translator<M> {
  const translate = (
    key: MessageKey<M>,
    params: MessageParams = {}
  ): string => {
    const found = lookup(catalog, key);

    if (typeof found === 'string') {
      return interpolate(found, params);
    }

    if (isMessageFunction(found)) {
      return found(params);
    }

    if (isPlural(found)) {
      const count = typeof params.count === 'number' ? params.count : 0;
      return interpolate(found[pluralCategory(language, count)], params);
    }

    throw new Error(`Missing message for key "${key}".`);
  };

  return translate;
}
