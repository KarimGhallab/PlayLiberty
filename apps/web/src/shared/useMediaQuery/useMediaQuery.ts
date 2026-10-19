import { useEffect, useState } from 'react';

/*
 * The one place the app reads the viewport: a header's arrangements differ by
 * markup, so a screen asks here and passes it to its own `arrangement`. Without
 * `matchMedia` it reports false, the web arrangement.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => readMatch(query));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const list = window.matchMedia(query);

    // Read the query again before subscribing; it can change after render.
    setMatches(list.matches);

    const onChange = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };

    list.addEventListener('change', onChange);

    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

function readMatch(query: string): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }

  return window.matchMedia(query).matches;
}

/* The mobile line: 768, the corpus's own choice, no breakpoint between 390 and
 * 1056. Not a custom property, so each branching stylesheet restates it. */
export const MOBILE_QUERY = '(max-width: 767px)';

/** The preference that removes motion without removing the state change. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** A synchronous read for a presence exit, which cannot wait for a render. */
export function prefersReducedMotion(): boolean {
  return readMatch(REDUCED_MOTION_QUERY);
}
