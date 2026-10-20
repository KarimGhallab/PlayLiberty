import { describe, expect, it } from 'vitest';

import { Language } from '../types.js';
import { resolveLanguage, toLanguage } from './resolveLanguage.js';

describe('toLanguage', () => {
  it('resolves a regional tag to its base', () => {
    expect(toLanguage('fr-CA')).toBe(Language.French);
    expect(toLanguage('FR')).toBe(Language.French);
  });

  it('returns null for an unsupported tag', () => {
    expect(toLanguage('de-DE')).toBeNull();
  });
});

describe('resolveLanguage', () => {
  it('uses the browser preference when there is no explicit choice', () => {
    expect(resolveLanguage(null, ['en-US', 'en'])).toBe(Language.English);
  });

  it('resolves a regional browser preference to its base', () => {
    expect(resolveLanguage(null, ['fr-CA', 'en'])).toBe(Language.French);
  });

  it('falls back to English for an unsupported language', () => {
    expect(resolveLanguage(null, ['de-DE', 'es'])).toBe(Language.English);
  });

  it('ignores an unsupported explicit choice and uses the browser preference', () => {
    expect(resolveLanguage('de', ['fr'])).toBe(Language.French);
  });
});
