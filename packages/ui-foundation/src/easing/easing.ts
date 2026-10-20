import { curves } from '@playliberty/tokens';
import type { EasingCurve } from '@playliberty/tokens';

/** The four control numbers in React Native order, x1 y1 x2 y2; the emitter
 * writes the CSS `cubic-bezier()`, so no client parses CSS. */
export const standardEasingBezier: EasingCurve = curves['ease-standard'].value;
