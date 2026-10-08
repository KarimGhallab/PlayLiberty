import { describe, expect, it } from 'vitest';

import { en } from '../en.js';
import { Language } from '../types.js';
import type { MessageParams } from '../types.js';
import { createTranslator } from './createTranslator.js';

describe('createTranslator', () => {
  it('reads a nested key and interpolates a parameter', () => {
    const catalog = {
      greeting: 'Hello, {name}!',
      nested: { farewell: 'Bye, {name}.' }
    };
    const t = createTranslator(catalog, Language.English);

    expect(t('greeting', { name: 'Ada' })).toBe('Hello, Ada!');
    expect(t('nested.farewell', { name: 'Ada' })).toBe('Bye, Ada.');
  });

  it('leaves a placeholder with no parameter in place', () => {
    const t = createTranslator(
      { greeting: 'Hello, {name}!' },
      Language.English
    );

    expect(t('greeting')).toBe('Hello, {name}!');
  });

  it('selects the one form for a single count and the other for many', () => {
    const catalog = {
      items: { one: '{count} item', other: '{count} items' }
    };
    const t = createTranslator(catalog, Language.English);

    expect(t('items', { count: 0 })).toBe('0 items');
    expect(t('items', { count: 1 })).toBe('1 item');
    expect(t('items', { count: 5 })).toBe('5 items');
  });

  it('treats zero as singular in French', () => {
    const catalog = {
      items: { one: '{count} piste', other: '{count} pistes' }
    };
    const t = createTranslator(catalog, Language.French);

    expect(t('items', { count: 0 })).toBe('0 piste');
    expect(t('items', { count: 1 })).toBe('1 piste');
    expect(t('items', { count: 2 })).toBe('2 pistes');
  });

  it('renders a function entry from its parameters', () => {
    const catalog = {
      echo: (params: MessageParams): string => `value: ${params.value}`
    };
    const t = createTranslator(catalog, Language.English);

    expect(t('echo', { value: 3 })).toBe('value: 3');
  });

  it('pins the library strings, the level the catalog inherits', () => {
    const t = createTranslator(en, Language.English);

    expect(t('count.tracks', { count: 1 })).toBe('1 track');
    expect(t('count.tracks', { count: 42 })).toBe('42 tracks');
  });
});
