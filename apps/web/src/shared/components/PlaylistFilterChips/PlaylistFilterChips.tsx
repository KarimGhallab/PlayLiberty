import { useRef } from 'react';

import { REMOTE_REMOVED, TrackFileStatus } from '@playliberty/contracts';
import type {
  Provider,
  TrackFileStatusCounts,
  TrackFilterState
} from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { providerLabel, useI18n } from '@playliberty/i18n';

import Chip from '../Chip/Chip';
import type { ChipTone } from '../Chip/Chip';
import styles from './PlaylistFilterChips.module.scss';
import { useRailOverflow } from './useRailOverflow';

/*
 * Counts are the whole-playlist aggregate, so they never follow the filter.
 * The detail draws a zero as evidence; the library hides a status no track
 * carries. The retained view is always hidden at zero. The chips are disabled
 * while the detail's shuffled queue is on.
 */

interface PlaylistFilterChipsProps {
  counts: TrackFileStatusCounts;
  remoteRemoved: number;
  provider: Provider;
  active: TrackFilterState | null;
  disabled?: boolean;
  /* Whether a status with no tracks is drawn. */
  showEmpty?: boolean;
  /* The word for All where another All on screen counts playlists. */
  allLabelKey?: MessageKey<Messages>;
  onChange: (state: TrackFilterState | null) => void;
}

interface Chip {
  readonly value: TrackFilterState | null;
  readonly labelKey: MessageKey<Messages>;
  readonly tone: ChipTone;
}

const CHIPS: readonly Chip[] = [
  { value: null, labelKey: 'detail.filterAll', tone: 'accent' },
  {
    value: TrackFileStatus.Stored,
    labelKey: 'trackState.stored',
    tone: 'stored'
  },
  {
    value: TrackFileStatus.Pending,
    labelKey: 'trackState.pending',
    tone: 'pending'
  },
  {
    value: TrackFileStatus.Downloading,
    labelKey: 'trackState.downloading',
    tone: 'downloading'
  },
  {
    value: TrackFileStatus.Failed,
    labelKey: 'trackState.failed',
    tone: 'failed'
  },
  {
    value: TrackFileStatus.Unavailable,
    labelKey: 'trackState.unavailableChip',
    tone: 'unavailable'
  },
  {
    value: REMOTE_REMOVED,
    labelKey: 'trackState.retainedChip',
    tone: 'retained'
  }
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

function countOf(
  chip: Chip,
  counts: TrackFileStatusCounts,
  remoteRemoved: number
): number {
  if (chip.value === null) {
    return totalOf(counts);
  }

  return chip.value === REMOTE_REMOVED ? remoteRemoved : counts[chip.value];
}

export default function PlaylistFilterChips({
  counts,
  remoteRemoved,
  provider,
  active,
  disabled = false,
  showEmpty = true,
  allLabelKey,
  onChange
}: PlaylistFilterChipsProps) {
  const { t } = useI18n();
  const railRef = useRef<HTMLDivElement>(null);
  const overflow = useRailOverflow(railRef);
  const chips = CHIPS.filter(chip => {
    if (chip.value === null) {
      return true;
    }

    return chip.value === REMOTE_REMOVED
      ? remoteRemoved > 0
      : showEmpty || counts[chip.value] > 0;
  });

  return (
    <div
      className={styles.chips}
      data-overflow={overflow}
      role="group"
      aria-label={t('detail.filterBy')}>
      <div ref={railRef} className={styles.chips__rail}>
        {chips.map(chip => {
          const pressed = active === chip.value;
          const count = countOf(chip, counts, remoteRemoved);
          const labelKey =
            chip.value === null
              ? (allLabelKey ?? chip.labelKey)
              : chip.labelKey;
          const label = t(labelKey, {
            count,
            provider: providerLabel(t, provider)
          });

          return (
            <Chip
              key={chip.value ?? 'all'}
              label={label}
              count={count}
              tone={chip.tone}
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
