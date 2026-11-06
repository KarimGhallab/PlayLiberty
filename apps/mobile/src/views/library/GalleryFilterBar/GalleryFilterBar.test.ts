import { describe, expect, it } from '@jest/globals';

import { SCOPE_STACK_SCALE, stacksScope } from './GalleryFilterBar';

describe('the gallery filter bar', () => {
  it('moves the scope pair to its own row from 1.3', () => {
    expect(stacksScope(1)).toBe(false);
    expect(stacksScope(1.29)).toBe(false);
    expect(stacksScope(SCOPE_STACK_SCALE)).toBe(true);
    expect(stacksScope(2)).toBe(true);
  });
});
