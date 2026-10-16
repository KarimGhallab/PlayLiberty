import { useLayoutEffect, useRef, useState } from 'react';

/*
 * The play/pause morph's transition, reported as the `data-run` the strip
 * animates on: forward plays play to pause, reverse pause to play, and the
 * first render is not a transition. The layout effect lands before paint.
 */

/** The directions a morph can play, matching the stylesheet's attribute. */
export type MorphRun = '' | 'reverse';

export function usePlayPauseMorph(playing: boolean): {
  readonly run: MorphRun | undefined;
  readonly endRun: () => void;
} {
  const previous = useRef(playing);
  const [run, setRun] = useState<MorphRun | undefined>(undefined);

  useLayoutEffect(() => {
    if (previous.current === playing) {
      return;
    }

    previous.current = playing;
    setRun(playing ? '' : 'reverse');
  }, [playing]);

  return { run, endRun: () => setRun(undefined) };
}
