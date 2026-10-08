import type { Language } from '../types.js';

/*
 * The per-browser choice, remembered under one key. A storage that refuses a
 * read or a write (private mode, a quota) is not worth breaking the interface
 * over, so both calls swallow the failure the way the player's persistence does.
 */

export const LANGUAGE_STORAGE_KEY = 'playliberty.language';

/** The stored choice, or null when there is none or storage refuses a read. */
export function readLanguage(storage: Storage): string | null {
  try {
    return storage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Remember the choice, ignoring a storage that refuses the write. */
export function writeLanguage(storage: Storage, language: Language): void {
  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // A storage that refuses the write is not worth breaking the interface over.
  }
}
