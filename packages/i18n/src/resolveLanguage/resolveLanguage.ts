import { Language } from '../types.js';

/* Resolved once per browser: `languagechange` is not listened for, so a browser
 * setting change does not flip the interface under the reader. */

const SUPPORTED: readonly Language[] = [Language.English, Language.French];

export function toLanguage(tag: string): Language | null {
  const base = tag.toLowerCase().split('-')[0];
  return SUPPORTED.find(language => language === base) ?? null;
}

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
