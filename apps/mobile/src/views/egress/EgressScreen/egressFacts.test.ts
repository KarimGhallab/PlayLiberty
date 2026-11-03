import { describe, expect, it } from '@jest/globals';

import { stackFacts } from './egressFacts';

describe('the egress facts', () => {
  it('keeps the pair in two columns up to 1.3', () => {
    expect(stackFacts(1)).toBe(false);
    expect(stackFacts(1.3)).toBe(false);
  });

  it('stacks the pair above 1.3', () => {
    expect(stackFacts(1.31)).toBe(true);
    expect(stackFacts(2)).toBe(true);
  });
});
