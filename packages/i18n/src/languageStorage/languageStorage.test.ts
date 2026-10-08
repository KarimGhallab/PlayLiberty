import { describe, expect, it } from 'vitest';

import { Language } from '../types.js';
import {
  LANGUAGE_STORAGE_KEY,
  readLanguage,
  writeLanguage
} from './languageStorage.js';

class MemoryStorage implements Storage {
  private readonly _values = new Map<string, string>();

  get length(): number {
    return this._values.size;
  }

  clear(): void {
    this._values.clear();
  }

  getItem(key: string): string | null {
    return this._values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this._values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this._values.delete(key);
  }

  setItem(key: string, value: string): void {
    this._values.set(key, value);
  }
}

class DeniedStorage implements Storage {
  get length(): number {
    throw new Error('denied');
  }

  clear(): void {
    throw new Error('denied');
  }

  getItem(): string | null {
    throw new Error('denied');
  }

  key(): string | null {
    throw new Error('denied');
  }

  removeItem(): void {
    throw new Error('denied');
  }

  setItem(): void {
    throw new Error('denied');
  }
}

describe('languageStorage', () => {
  it('round-trips a choice under the one key', () => {
    const storage = new MemoryStorage();

    writeLanguage(storage, Language.French);

    expect(storage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
    expect(readLanguage(storage)).toBe('fr');
  });

  it('reads null when nothing is stored', () => {
    expect(readLanguage(new MemoryStorage())).toBeNull();
  });

  it('reads null and writes nothing when storage refuses', () => {
    expect(readLanguage(new DeniedStorage())).toBeNull();
    expect(() =>
      writeLanguage(new DeniedStorage(), Language.English)
    ).not.toThrow();
  });
});
