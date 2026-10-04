/*
 * The equalizer strip on a row's artwork while it plays. Six bars, each a fixed
 * 3px wide at a 7px pitch, growing from the bottom on `transform: scaleY` so a
 * moving bar relayouts nothing. The strip reaches half way up the tile.
 *
 * The phase table is not hand-written. Phase i is `(i * stride) mod M` where
 * `M = 2n - 1`, and the delay is `-(phase / M) * period`. `M = 2n - 1` rather
 * than `n` is what stops the phases being an evenly spaced staircase, which reads
 * as a wave sweeping across the strip rather than six independent bars. At six
 * bars a stride of 3 is coprime with 11, so no two bars share a phase.
 *
 * `--rest` is the still form, read from the same walk through a five-value scale
 * cycle. It is what shows the moment the animation is off (reduced motion, or a
 * background tab), so the row still differs from a paused one without a second
 * table to keep in step.
 *
 * The geometry and the table are transcribed from `docs/design/specimen.css` at
 * the `.art > .bars` size; the module stylesheet carries them.
 */

/** The phases, in bar order, as `--rest` scale values. */
const RESTS: readonly number[] = [0.35, 0.8, 1, 0.42, 1, 0.42];

/** The phase delays in milliseconds, in bar order. */
const DELAYS: readonly number[] = [0, -380, -760, -1150, -130, -510];

interface TrackBarsProps {
  /** The class names the host's stylesheet gives the strip and its bars. */
  readonly className: string;
  readonly barClassName: string;
}

export default function TrackBars({ className, barClassName }: TrackBarsProps) {
  return (
    <span className={className} role="img" aria-label="Playing">
      {RESTS.map((rest, index) => (
        <span
          key={rest + ':' + DELAYS[index]}
          className={barClassName}
          style={{
            ['--rest' as string]: String(rest),
            animationDelay: `${DELAYS[index]}ms`
          }}
        />
      ))}
    </span>
  );
}
