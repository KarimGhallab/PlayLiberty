import { describe, expect, it } from '@jest/globals';

import { standardEasingBezier } from '@playliberty/ui-foundation';

import { tokenDuration } from '../../../shared/styles/tokens';

import { swipeMotion } from './swipeMotion';

describe('the swipe motion', () => {
  it('runs on the slow duration and the one curve', () => {
    expect(swipeMotion.duration).toBe(tokenDuration('motion-slow'));
    expect(swipeMotion.curve).toEqual(standardEasingBezier);
  });
});
