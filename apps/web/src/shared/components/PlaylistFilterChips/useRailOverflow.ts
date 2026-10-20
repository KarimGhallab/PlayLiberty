import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

/*
 * The rail is one line only on a phone, so that is where a chip can hide. The
 * edge that hides one is measured, never guessed, so the fade cannot lie.
 */

export enum RailOverflow {
  None = 'none',
  Start = 'start',
  End = 'end',
  Both = 'both'
}

/* A pixel of slack absorbs fractional layout, so a rounded edge is not read as
 * a hidden chip. */
const SLACK = 1;

export function overflowOf(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number
): RailOverflow {
  const hidden = scrollWidth - clientWidth;
  const start = scrollLeft > SLACK;
  const end = scrollLeft < hidden - SLACK;

  if (start) {
    return end ? RailOverflow.Both : RailOverflow.Start;
  }

  return end ? RailOverflow.End : RailOverflow.None;
}

export function useRailOverflow(
  rail: RefObject<HTMLElement | null>
): RailOverflow {
  const [overflow, setOverflow] = useState(RailOverflow.None);

  const measure = useCallback((): void => {
    const element = rail.current;

    if (element === null) {
      return;
    }

    setOverflow(
      overflowOf(element.scrollLeft, element.scrollWidth, element.clientWidth)
    );
  }, [rail]);

  /* Every render can change a chip's width, so a count that grows past the rail
   * is measured in the same pass that drew it. */
  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    const element = rail.current;

    if (element === null) {
      return;
    }

    element.addEventListener('scroll', measure, { passive: true });

    /* A window resize changes the rail's width without a render of its own. */
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            measure();
          });

    observer?.observe(element);

    return () => {
      element.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [rail, measure]);

  return overflow;
}
