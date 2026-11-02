import { tokenLength } from '../../../shared/styles/tokens';

/* The gallery's content box: the screen's one inset on each side. */
function contentWidth(windowWidth: number): number {
  return windowWidth - tokenLength('space-4') * 2;
}

/* Two columns split the content box less the one gap between them, so the right
 * column lands on the inset and a 320pt phone keeps both. */
export function galleryColumnWidth(windowWidth: number): number {
  return (contentWidth(windowWidth) - tokenLength('space-3')) / 2;
}

/* A pinned card takes a little under half, so the next one peeks at the edge. */
export function galleryPinnedWidth(windowWidth: number): number {
  return (contentWidth(windowWidth) - tokenLength('space-3')) * 0.45;
}
