import type {
  MessageFunction,
  MessageParams,
  PluralMessage
} from '../types.js';
import { Language } from '../types.js';

/*
 * No third-party i18n dependency: the web client and Hermes must say the same
 * sentence, and ICU and `Intl` differ by platform.
 */

/** The catalog's dotted keys, derived from its shape, so a typo is a compile
 * error. */
export type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends string | PluralMessage | MessageFunction
    ? K
    : `${K}.${MessageKey<T[K]>}`;
}[keyof T & string];

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

/* French singles out zero and one (`0 piste`), English only one; a catalog
 * carries two forms and no ICU. */
function pluralCategory(
  language: Language,
  count: number
): keyof PluralMessage {
  if (language === Language.French) {
    return count <= 1 ? 'one' : 'other';
  }

  return count === 1 ? 'one' : 'other';
}

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
