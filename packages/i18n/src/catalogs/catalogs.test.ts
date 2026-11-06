import { describe, expect, it } from 'vitest';

import { createTranslator } from '../createTranslator/createTranslator.js';
import { Language } from '../types.js';
import { catalogs } from './catalogs.js';

describe('the catalogs', () => {
  /* The brand is a proper noun: one spelling in every language. */
  it('name the product the same in both languages', () => {
    expect(catalogs[Language.English].app.name).toBe('PlayLiberté');
    expect(catalogs[Language.French].app.name).toBe('PlayLiberté');
  });

  it('word the retained filter chip and its empty list in both languages', () => {
    const en = createTranslator(catalogs[Language.English], Language.English);
    const fr = createTranslator(catalogs[Language.French], Language.French);

    expect(en('trackState.retainedChip', { count: 2 })).toBe('Retained');
    expect(fr('trackState.retainedChip', { count: 2 })).toBe('Conservées');
    expect(fr('trackState.retainedChip', { count: 1 })).toBe('Conservée');

    expect(en('trackState.unavailableChip', { count: 2 })).toBe('Never stored');
    expect(fr('trackState.unavailableChip', { count: 2 })).toBe(
      'Jamais stockées'
    );
    expect(fr('trackState.unavailableChip', { count: 1 })).toBe(
      'Jamais stockée'
    );

    expect(
      en('detail.filterEmpty.remoteRemoved', { provider: 'YouTube' })
    ).toBe('No track was retained after a YouTube removal');
    expect(
      fr('detail.filterEmpty.remoteRemoved', { provider: 'YouTube' })
    ).toBe('Aucune piste conservée après un retrait de YouTube');
  });
});
