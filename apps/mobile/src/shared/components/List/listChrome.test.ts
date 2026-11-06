import { describe, expect, it } from '@jest/globals';

import { verticalListChrome } from './listChrome';

describe('the shared vertical list chrome', () => {
  it('hides the platform scrollbar on every list', () => {
    expect(verticalListChrome.showsVerticalScrollIndicator).toBe(false);
  });
});
