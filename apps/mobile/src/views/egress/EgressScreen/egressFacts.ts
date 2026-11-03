/* Above this scale a two-column fact row wraps a label away from its value, so
 * the facts stack. */
const STACK_SCALE = 1.3;

/** Whether the egress facts take one column at this font scale. */
export function stackFacts(fontScale: number): boolean {
  return fontScale > STACK_SCALE;
}
