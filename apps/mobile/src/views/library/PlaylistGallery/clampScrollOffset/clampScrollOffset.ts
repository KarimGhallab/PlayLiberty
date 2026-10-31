/*
 * A horizontal row keeps its offset when its content shrinks, so the platform
 * clamps it on the next scroll instead. The row clamps at once, or the cards
 * leave their former place blank.
 */
export function clampScrollOffset(
  offset: number,
  contentWidth: number,
  viewportWidth: number
): number {
  return Math.max(0, Math.min(offset, contentWidth - viewportWidth));
}
