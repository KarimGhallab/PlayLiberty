import { getLocales } from 'expo-localization';

/** The device's preferred tags, most preferred first. */
export function deviceLanguages(): readonly string[] {
  return getLocales().map(locale => locale.languageTag);
}
