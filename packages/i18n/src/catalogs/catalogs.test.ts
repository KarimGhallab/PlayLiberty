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

    expect(
      en('trackState.removedFromChip', { count: 2, provider: 'YouTube' })
    ).toBe('Removed from YouTube');
    expect(
      fr('trackState.removedFromChip', { count: 2, provider: 'YouTube' })
    ).toBe('Retirées de YouTube');
    expect(
      fr('trackState.removedFromChip', { count: 1, provider: 'YouTube' })
    ).toBe('Retirée de YouTube');

    expect(
      en('detail.filterEmpty.remoteRemoved', { provider: 'YouTube' })
    ).toBe('No track removed from YouTube is still stored');
    expect(
      fr('detail.filterEmpty.remoteRemoved', { provider: 'YouTube' })
    ).toBe("Aucune piste retirée de YouTube n'est toujours stockée");
  });
});
