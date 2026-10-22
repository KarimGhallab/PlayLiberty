/*
 * The equalizer strip on the current row's artwork. The row's word names the
 * playback state, so the strip is decorative; the phases keep it from stepping.
 */

/** The phases, in bar order, as `--rest` scale values; the still form drawn
 * when the animation stops (reduced motion, or a background tab). */
const RESTS: readonly number[] = [0.35, 0.8, 1, 0.42, 1, 0.42];

/** The phase delays in milliseconds, in bar order. */
const DELAYS: readonly number[] = [0, -380, -760, -1150, -130, -510];

interface TrackBarsProps {
  readonly className: string;
  readonly barClassName: string;
}

export default function TrackBars({ className, barClassName }: TrackBarsProps) {
  return (
    <span className={className} aria-hidden="true">
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
