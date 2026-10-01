import { curves } from '@playliberty/tokens';
import type { EasingCurve } from '@playliberty/tokens';

/**
 * The four control numbers of the system's only curve, in the order React
 * Native's `Easing.bezier` takes them: x1, y1, x2, y2.
 *
 * The token source holds the numbers and the emitter writes the CSS
 * `cubic-bezier()` syntax for the web, so the mobile client spreads this into
 * `Easing.bezier(...standardEasingBezier)` and no client ever parses CSS.
 */
export const standardEasingBezier: EasingCurve = curves['ease-standard'].value;
