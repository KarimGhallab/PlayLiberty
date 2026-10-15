import { TrackFileStatus } from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import styles from './PlaylistFilterChips.module.scss';

/*
 * Every chip is always drawn, a zero included, because the count is the reason
 * the chip exists: the choice is made knowing what the list will hold.
 *
 * The counts are the whole-playlist aggregate folded into the list read, so they
 * never follow the filter. The chips are disabled while the list draws the
 * shuffled queue's order, because the filter is the unshuffled list's view and
 * the shuffled list is not narrowed.
 *
 * The component is presentational: the page owns the read and the filter state,
 * `active` is the one chip in force (null is "All"), and `onChange` asks for the
 * state's rows. Pressing the chip already in force asks for nothing.
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

  return (
    <div
      className={styles.chips}
      role="group"
      aria-label={t('detail.filterBy')}>
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
  );
}
