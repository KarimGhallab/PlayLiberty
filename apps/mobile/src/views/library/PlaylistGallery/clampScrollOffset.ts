/* A horizontal row keeps its offset when its content shrinks, and the platform
 * clamps only on the next scroll. The row clamps at once, or the cards leave
 * their former place blank. */
export function clampScrollOffset(
  offset: number,
  contentWidth: number,
  viewportWidth: number
): number {
  return Math.max(0, Math.min(offset, contentWidth - viewportWidth));
}
