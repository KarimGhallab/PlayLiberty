/*
 * Answers one query and delegates every other to the global default, so moving
 * the viewport leaves `prefers-reduced-motion` alone. The returned function
 * restores the original; a stub left in place would follow every later test.
 */
export function stubViewport(matchingQuery: string): () => void {
  const original = window.matchMedia;

  window.matchMedia = (query: string) =>
    ({
      matches: query === matchingQuery,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    }) as MediaQueryList;

  return () => {
    window.matchMedia = original;
  };
}
