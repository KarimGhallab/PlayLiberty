import { describe, expect, it } from 'vitest';

import { catalogs } from './catalogs.js';
import { Language } from './types.js';

describe('the catalogs', () => {
  /* The brand is a proper noun: one spelling in every language. */
  it('name the product the same in both languages', () => {
    expect(catalogs[Language.English].app.name).toBe('PlayLiberté');
    expect(catalogs[Language.French].app.name).toBe('PlayLiberté');
  });
});
