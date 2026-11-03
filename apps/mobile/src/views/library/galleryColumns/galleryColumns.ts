import { contentWidth } from '../../../shared/styles/contentColumn/contentColumn';
import { tokenLength } from '../../../shared/styles/tokens';

/* The one width at which the gallery gains its third column. */
export const GALLERY_WIDE_BREAKPOINT = 600;

const GAP = tokenLength('space-3');

/* The gallery's content box: the capped column less the screen's inset on each
 * side. */
function contentBox(windowWidth: number): number {
  return contentWidth(windowWidth) - tokenLength('space-4') * 2;
}

/* Two columns below the breakpoint, three at or above it. */
export function galleryColumnCount(windowWidth: number): number {
  return contentWidth(windowWidth) >= GALLERY_WIDE_BREAKPOINT ? 3 : 2;
}

/* The columns split the content box less their gaps, so the right column lands
 * on the inset and a 320pt phone keeps both. */
export function galleryColumnWidth(windowWidth: number): number {
  const count = galleryColumnCount(windowWidth);

  return (contentBox(windowWidth) - GAP * (count - 1)) / count;
}

/* A pinned card takes a little under one column, so the next one peeks. */
export function galleryPinnedWidth(windowWidth: number): number {
  return galleryColumnWidth(windowWidth) * 0.9;
}
