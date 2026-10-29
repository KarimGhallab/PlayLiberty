import type { Language } from '../types.js';

export const LANGUAGE_STORAGE_KEY = 'playliberty.language';

/** What the binding needs to remember a choice: the browser's `Storage` is one. */
export interface LanguageStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The stored choice, or null when there is none or storage refuses a read. */
export function readLanguage(storage: LanguageStore): string | null {
  try {
    return storage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeLanguage(
  storage: LanguageStore,
  language: Language
): void {
  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // A storage refusing the write (private mode, quota) is not worth breaking
    // the interface over.
  }
}
