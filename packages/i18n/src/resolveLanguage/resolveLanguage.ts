import { Language } from '../types.js';

/*
 * The locale is resolved once, per browser, in a fixed order: an explicit choice
 * wins, otherwise the browser's preferred languages are matched by prefix against
 * the supported set, otherwise English. The app resolves on boot and does not
 * listen for `languagechange`, so a browser setting change does not flip the
 * interface under the reader.
 */

/** The supported languages, in fallback order. */
const SUPPORTED: readonly Language[] = [Language.English, Language.French];

/** The supported language a locale tag names, or null. `fr-CA` resolves to `fr`. */
export function toLanguage(tag: string): Language | null {
  const base = tag.toLowerCase().split('-')[0];
  return SUPPORTED.find(language => language === base) ?? null;
}

/**
 * The language to render. An explicit choice wins; an unsupported choice is
 * ignored; otherwise the first preferred locale that names a supported language;
 * otherwise English.
 */
export function resolveLanguage(
  explicit: string | null,
  preferred: readonly string[]
): Language {
  const chosen = explicit === null ? null : toLanguage(explicit);

  if (chosen !== null) {
    return chosen;
  }

  for (const tag of preferred) {
    const matched = toLanguage(tag);

    if (matched !== null) {
      return matched;
    }
  }

  return Language.English;
}
