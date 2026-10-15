/*
 * The media-query stub answers one query and delegates every other to the global
 * default, so a test can move the viewport without disturbing the
 * `prefers-reduced-motion` checks. The returned function puts the original back,
 * because a stub left in place would follow every later test.
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
