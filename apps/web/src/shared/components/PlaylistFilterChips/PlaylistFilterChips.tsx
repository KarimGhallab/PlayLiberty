import { useRef } from 'react';

import { TrackFileStatus } from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import styles from './PlaylistFilterChips.module.scss';
import { useRailOverflow } from './useRailOverflow';

/*
 * Every chip is always drawn, a zero included, because the count is the reason
 * the chip exists. The counts are the whole-playlist aggregate, so they never
 * follow the filter, and the chips are disabled while the shuffled queue is on.
 */

interface PlaylistFilterChipsProps {
  counts: TrackFileStatusCounts;
  active: TrackFileStatus | null;
  disabled?: boolean;
  onChange: (state: TrackFileStatus | null) => void;
}

interface Chip {
  readonly value: TrackFileStatus | null;
  readonly labelKey: MessageKey<Messages>;
}

const CHIPS: readonly Chip[] = [
  { value: null, labelKey: 'detail.filterAll' },
  { value: TrackFileStatus.Stored, labelKey: 'trackState.stored' },
  { value: TrackFileStatus.Pending, labelKey: 'trackState.pending' },
  { value: TrackFileStatus.Downloading, labelKey: 'trackState.downloading' },
  { value: TrackFileStatus.Failed, labelKey: 'trackState.failed' },
  { value: TrackFileStatus.Unavailable, labelKey: 'trackState.unavailable' }
];

function totalOf(counts: TrackFileStatusCounts): number {
  return (
    counts[TrackFileStatus.Stored] +
    counts[TrackFileStatus.Pending] +
    counts[TrackFileStatus.Downloading] +
    counts[TrackFileStatus.Failed] +
    counts[TrackFileStatus.Unavailable]
  );
}

export default function PlaylistFilterChips({
  counts,
  active,
  disabled = false,
  onChange
}: PlaylistFilterChipsProps) {
  const { t } = useI18n();
  const total = totalOf(counts);
  const railRef = useRef<HTMLDivElement>(null);
  const overflow = useRailOverflow(railRef);

  return (
    <div
      className={styles.chips}
      data-overflow={overflow}
      role="group"
      aria-label={t('detail.filterBy')}>
      <div ref={railRef} className={styles.chips__rail}>
        {CHIPS.map(chip => {
          const pressed = active === chip.value;
          const count = chip.value === null ? total : counts[chip.value];
          const label = t(chip.labelKey);

          return (
            <button
              key={chip.value ?? 'all'}
              type="button"
              className={styles.chips__chip}
              data-tone={chip.value ?? 'all'}
              aria-pressed={pressed}
              aria-label={`${label} ${count}`}
              disabled={disabled}
              onClick={() => {
                if (!pressed) {
                  onChange(chip.value);
                }
              }}>
              <span className={styles.chips__label}>{label}</span>
              <span className={styles.chips__count}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
