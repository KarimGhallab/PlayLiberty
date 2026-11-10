import { useRef } from 'react';

import type {
  Provider,
  TrackFileStatusCounts,
  TrackFilterState
} from '@playliberty/contracts';
import { REMOTE_REMOVED } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { providerLabel, useI18n } from '@playliberty/i18n';
import {
  STATUS_CHIPS,
  TrackTone,
  statusCount,
  totalStatusCount
} from '@playliberty/ui-foundation';

import type { ChipTone } from '../Chip/Chip';
import Chip from '../Chip/Chip';
import styles from './PlaylistFilterChips.module.scss';
import { useRailOverflow } from './useRailOverflow/useRailOverflow';

/*
 * Counts never follow the filter; the library hides a zero status, while the
 * detail draws it. The chips pause under a shuffled queue.
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

/* The app maps the shared tone name to its own chip class. */
const CHIP_TONES: Readonly<Record<TrackTone, ChipTone>> = {
  [TrackTone.Pending]: 'pending',
  [TrackTone.Downloading]: 'downloading',
  [TrackTone.Stored]: 'stored',
  [TrackTone.Failed]: 'failed',
  [TrackTone.Unavailable]: 'unavailable',
  [TrackTone.Removed]: 'unavailable',
  [TrackTone.Retained]: 'retained'
};

const CHIPS: readonly Chip[] = [
  { value: null, labelKey: 'detail.filterAll', tone: 'accent' },
  ...STATUS_CHIPS.map(chip => ({
    value: chip.value,
    labelKey: chip.label,
    tone: CHIP_TONES[chip.tone]
  }))
];

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
          const count =
            chip.value === null
              ? totalStatusCount(counts)
              : statusCount(chip.value, counts, remoteRemoved);
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
