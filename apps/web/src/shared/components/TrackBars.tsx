import { equalizerRests } from '@playliberty/ui-foundation';

/*
 * The equalizer strip on the current row's artwork. The row's word names the
 * playback state, so the strip is decorative; the phases keep it from stepping.
 */

/** The phase delays in milliseconds, in bar order. */
const DELAYS: readonly number[] = [0, -380, -760, -1150, -130, -510];

interface TrackBarsProps {
  readonly className: string;
  readonly barClassName: string;
}

export default function TrackBars({ className, barClassName }: TrackBarsProps) {
  return (
    <span className={className} aria-hidden="true">
      {equalizerRests.map((rest, index) => (
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
