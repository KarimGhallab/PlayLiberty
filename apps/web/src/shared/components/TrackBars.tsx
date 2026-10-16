import { useI18n } from '@playliberty/i18n';

/*
 * The equalizer strip on the current row's artwork: its label is the queue's
 * state, playing or paused, not the row's presence. The phase table, computed
 * with `M = 2n - 1` rather than `n`, keeps the bars from stair-stepping.
 */

/** The phases, in bar order, as `--rest` scale values; the still form drawn
 * when the animation stops (reduced motion, or a background tab). */
const RESTS: readonly number[] = [0.35, 0.8, 1, 0.42, 1, 0.42];

/** The phase delays in milliseconds, in bar order. */
const DELAYS: readonly number[] = [0, -380, -760, -1150, -130, -510];

interface TrackBarsProps {
  readonly className: string;
  readonly barClassName: string;
  readonly playing: boolean;
}

export default function TrackBars({
  className,
  barClassName,
  playing
}: TrackBarsProps) {
  const { t } = useI18n();

  return (
    <span
      className={className}
      role="img"
      aria-label={playing ? t('trackBars.playing') : t('trackBars.paused')}>
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
