import {
  type LanguageStore,
  readLanguage,
  writeLanguage
} from '../languageStorage/languageStorage.js';
import { resolveLanguage } from '../resolveLanguage/resolveLanguage.js';
import type { Language } from '../types.js';

export interface LanguageControllerOptions {
  readonly storage: LanguageStore;
  readonly preferred: readonly string[];
  readonly apply: (language: Language) => void;
  readonly initial?: Language;
}

export interface LanguageController {
  getLanguage: () => Language;
  setLanguage: (language: Language) => void;
  /** Tells the client's chrome what it starts in. */
  start: () => void;
  subscribe: (listener: () => void) => () => void;
}

/* The binding's state, free of React: the language is resolved once, a change
 * writes the port and tells the client's chrome, and a subscriber redraws. */
export function createLanguageController({
  storage,
  preferred,
  apply,
  initial
}: LanguageControllerOptions): LanguageController {
  let language = initial ?? resolveLanguage(readLanguage(storage), preferred);
  const listeners = new Set<() => void>();

  return {
    getLanguage: () => language,
    start: () => apply(language),
    setLanguage: next => {
      language = next;
      writeLanguage(storage, next);
      apply(next);

      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: listener => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    }
  };
}
