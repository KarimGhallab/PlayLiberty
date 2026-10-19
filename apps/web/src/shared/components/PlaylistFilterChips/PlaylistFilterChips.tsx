import { useRef } from 'react';

import { TrackFileStatus } from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import Chip from '../Chip/Chip';
import styles from './PlaylistFilterChips.module.scss';
import { useRailOverflow } from './useRailOverflow';

/*
 * Counts are the whole-playlist aggregate, so they never follow the filter.
 * The detail draws a zero as evidence; the library hides a status no track
 * carries. The chips are disabled while the detail's shuffled queue is on.
 */

interface PlaylistFilterChipsProps {
  counts: TrackFileStatusCounts;
  active: TrackFileStatus | null;
  disabled?: boolean;
  /* Whether a status with no tracks is drawn. */
  showEmpty?: boolean;
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
  showEmpty = true,
  onChange
}: PlaylistFilterChipsProps) {
  const { t } = useI18n();
  const total = totalOf(counts);
  const railRef = useRef<HTMLDivElement>(null);
  const overflow = useRailOverflow(railRef);
  const chips = showEmpty
    ? CHIPS
    : CHIPS.filter(chip => chip.value === null || counts[chip.value] > 0);

  return (
    <div
      className={styles.chips}
      data-overflow={overflow}
      role="group"
      aria-label={t('detail.filterBy')}>
      <div ref={railRef} className={styles.chips__rail}>
        {chips.map(chip => {
          const pressed = active === chip.value;
          const count = chip.value === null ? total : counts[chip.value];
          const label = t(chip.labelKey);

          return (
            <Chip
              key={chip.value ?? 'all'}
              label={label}
              count={count}
              tone={chip.value ?? 'accent'}
              selected={pressed}
              disabled={disabled}
              onClick={() => {
                if (!pressed) {
                  onChange(chip.value);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
