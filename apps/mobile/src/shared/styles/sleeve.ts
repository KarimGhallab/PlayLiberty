import { sleeveIndex } from '@playliberty/ui-foundation';

import { tokenColor } from './tokens';

const SLEEVES = [
  'sleeve-1',
  'sleeve-2',
  'sleeve-3',
  'sleeve-4',
  'sleeve-5',
  'sleeve-6'
] as const;

/** The sleeve hue an id draws when it has no image at all. */
export function sleeveColor(id: string): string {
  return tokenColor(SLEEVES[sleeveIndex(id) - 1] ?? 'sleeve-1');
}
