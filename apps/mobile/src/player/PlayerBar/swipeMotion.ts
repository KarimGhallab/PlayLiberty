import { standardEasingBezier } from '@playliberty/ui-foundation';

import { tokenDuration } from '../../shared/styles/tokens/tokens';

/* The swipe leaves on the slow end of the one curve, like every other motion. */
export const swipeMotion = {
  duration: tokenDuration('motion-slow'),
  curve: standardEasingBezier
} as const;
