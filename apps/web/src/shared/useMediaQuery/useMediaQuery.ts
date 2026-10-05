import { useEffect, useState } from 'react';

/*
 * Whether a media query currently matches, kept in step with the viewport.
 *
 * The one place this app reads the viewport, and it exists because the playlist
 * header has two arrangements that are different markup rather than two
 * stylesheets: the card places the cover above the identity and the row places
 * it beside, and CSS cannot turn one into the other. A screen that wants the
 * row on a phone inlines no DOM of its own; it asks here and passes the answer
 * to the component's own `arrangement`.
 *
 * It reads once on mount and subscribes to changes, so a rotation or a resized
 * window re-renders with the new arrangement rather than holding the one it
 * opened with. On a host without `matchMedia` it reports false, which is the
 * web arrangement: that is jsdom under test, where the desktop layout is what
 * the tests expect and a phantom mobile one would flip every assertion.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => readMatch(query));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const list = window.matchMedia(query);

    // The query can change between render and effect, so the current value is
    // read again before subscribing rather than trusted from the first render.
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

/*
 * The mobile line, one place. The design draws two widths, 1056 web and 390
 * phone, and names no breakpoint between them, so 768 is this corpus's own
 * choice: the first width at which the desk's 320px card beside a track list
 * stops leaving the list a usable title column. It is stated once here and once
 * in each stylesheet that branches on it, because a custom property cannot
 * carry a media query condition.
 */
export const MOBILE_QUERY = '(max-width: 767px)';
