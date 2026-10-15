import { useLayoutEffect, useRef, useState } from 'react';

/*
 * The play/pause morph's transition, reported as the `data-run` the strip
 * animates on. The resting frame is a state rule on the host; this reports only
 * that a transition is under way and which way it plays, for exactly as long as
 * the animation. `playing` is the state the morph ends on, so a change to it is
 * the transition: forward plays play to pause, reverse plays pause to play. The
 * first render is not a transition, so a freshly mounted button rests rather
 * than morphing in from nowhere.
 *
 * The layout effect is deliberate. `data-state` changes in the render and this
 * has to land in the same commit before the browser paints, or the state rule
 * would show the end frame for a frame and the morph would flash past its own
 * first frame. A passive effect runs after paint and would produce that flash.
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
