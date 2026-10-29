import { describe, expect, it } from 'vitest';

import {
  LANGUAGE_STORAGE_KEY,
  type LanguageStore
} from '../languageStorage/languageStorage.js';
import { Language } from '../types.js';
import { createLanguageController } from './languageController.js';

function memoryStore(value: string | null = null): LanguageStore {
  const values = new Map<string, string>();

  if (value !== null) {
    values.set(LANGUAGE_STORAGE_KEY, value);
  }

  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, next) => {
      values.set(key, next);
    }
  };
}

describe('the language controller', () => {
  it('resolves the explicit choice before the device', () => {
    const controller = createLanguageController({
      storage: memoryStore('en'),
      preferred: ['fr-FR'],
      apply: () => {}
    });

    expect(controller.getLanguage()).toBe(Language.English);
  });

  it('resolves the device before English', () => {
    const controller = createLanguageController({
      storage: memoryStore(),
      preferred: ['de-DE', 'fr-CA'],
      apply: () => {}
    });

    expect(controller.getLanguage()).toBe(Language.French);
  });

  it('falls back to English when nothing matches', () => {
    const controller = createLanguageController({
      storage: memoryStore(),
      preferred: ['de-DE'],
      apply: () => {}
    });

    expect(controller.getLanguage()).toBe(Language.English);
  });

  it('writes the choice and tells the client when the language changes', () => {
    const applied: Language[] = [];
    const storage = memoryStore();
    const controller = createLanguageController({
      storage,
      preferred: ['fr-FR'],
      apply: language => applied.push(language)
    });

    controller.start();
    controller.setLanguage(Language.English);

    expect(applied).toEqual([Language.French, Language.English]);
    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe(Language.English);
  });

  it('notifies its subscribers on a change', () => {
    let changes = 0;
    const controller = createLanguageController({
      storage: memoryStore(),
      preferred: [],
      apply: () => {}
    });

    const unsubscribe = controller.subscribe(() => {
      changes += 1;
    });

    controller.setLanguage(Language.French);
    unsubscribe();
    controller.setLanguage(Language.English);

    expect(changes).toBe(1);
  });
});
