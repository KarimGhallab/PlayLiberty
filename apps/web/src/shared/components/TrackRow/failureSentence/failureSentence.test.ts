import { describe, expect, it } from 'vitest';

import { FailureKind } from '@playliberty/contracts';
import { Language, catalogs, createTranslator } from '@playliberty/i18n';

import { failureSentence } from './failureSentence';

const t = createTranslator(catalogs[Language.English], Language.English);

describe('failureSentence', () => {
  it('names each stored kind in the catalog sentence', () => {
    expect(failureSentence(t, FailureKind.Blocked)).toBe(
      'YouTube blocked this download.'
    );
    expect(failureSentence(t, FailureKind.Private)).toBe(
      'This video is private.'
    );
    expect(failureSentence(t, FailureKind.Unavailable)).toBe(
      'This video is no longer available.'
    );
    expect(failureSentence(t, FailureKind.Network)).toBe(
      'YouTube could not be reached.'
    );
  });

  it('falls back to one sentence for an unknown or absent kind', () => {
    expect(failureSentence(t, FailureKind.Unknown)).toBe(
      'The download failed.'
    );
    expect(failureSentence(t, null)).toBe('The download failed.');
  });
});
