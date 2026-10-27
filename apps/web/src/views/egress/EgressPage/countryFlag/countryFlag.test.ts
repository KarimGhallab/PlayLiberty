import { describe, expect, it } from 'vitest';

import { Language } from '@playliberty/i18n';

import { countryNameOf, countryOf, flagOf } from './countryFlag';

describe('countryOf', () => {
  it('reads the country segment from the pool name', () => {
    expect(countryOf('01-FR-634')).toBe('FR');
    expect(countryOf('04-CH-FREE-2')).toBe('CH');
    expect(countryOf('01-fr')).toBe('FR');
    expect(countryOf('01-FR')).toBe('FR');
  });

  it('answers null when the name has no two-letter country segment', () => {
    expect(countryOf('01')).toBeNull();
    expect(countryOf('01-USA')).toBeNull();
    expect(countryOf('01-FR2')).toBeNull();
  });
});

describe('flagOf', () => {
  it('draws a flag from two regional indicator code points', () => {
    expect(flagOf('FR')).toBe('🇫🇷');
    expect(flagOf('fr')).toBe('🇫🇷');
    expect(flagOf('CH')).toBe('🇨🇭');
  });

  it('answers null for anything that is not a two-letter code', () => {
    expect(flagOf('USA')).toBeNull();
    expect(flagOf('1')).toBeNull();
  });
});

describe('countryNameOf', () => {
  it('names the region in the current language', () => {
    expect(countryNameOf('FR', Language.English)).toBe('France');
    expect(countryNameOf('CH', Language.English)).toBe('Switzerland');
    expect(countryNameOf('CH', Language.French)).toBe('Suisse');
  });

  it('answers null for anything that is not a two-letter code', () => {
    expect(countryNameOf('USA', Language.English)).toBeNull();
  });
});
