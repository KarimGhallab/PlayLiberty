import { describe, expect, it } from 'vitest';

import { curves } from '@playliberty/tokens';

import { standardEasingBezier } from './easing.js';

describe('standardEasingBezier', () => {
  it('is the token curve, in the order Easing.bezier takes it', () => {
    expect(standardEasingBezier).toEqual(curves['ease-standard'].value);
    expect(standardEasingBezier).toEqual([0.4, 0, 0.2, 1]);
  });
});
