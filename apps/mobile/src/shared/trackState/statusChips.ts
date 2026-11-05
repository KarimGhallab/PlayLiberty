import { REMOTE_REMOVED, TrackFileStatus } from '@playliberty/contracts';
import type {
  TrackFileStatusCounts,
  TrackFilterState
} from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { TrackTone } from '@playliberty/ui-foundation';

export interface StatusChip {
  readonly value: TrackFilterState;
  readonly label: MessageKey<Messages>;
  readonly tone: TrackTone | 'retained';
  readonly empty: MessageKey<Messages>;
}

/* One owner for a state's chip word, tone and filter-empty sentence. */
export const STATUS_CHIPS: readonly StatusChip[] = [
  {
    value: TrackFileStatus.Stored,
    label: 'trackState.stored',
    tone: TrackTone.Stored,
    empty: 'detail.filterEmpty.stored'
  },
  {
    value: TrackFileStatus.Pending,
    label: 'trackState.pending',
    tone: TrackTone.Pending,
    empty: 'detail.filterEmpty.pending'
  },
  {
    value: TrackFileStatus.Downloading,
    label: 'trackState.downloading',
    tone: TrackTone.Downloading,
    empty: 'detail.filterEmpty.downloading'
  },
  {
    value: TrackFileStatus.Failed,
    label: 'trackState.failed',
    tone: TrackTone.Failed,
    empty: 'detail.filterEmpty.failed'
  },
  {
    value: TrackFileStatus.Unavailable,
    label: 'trackState.unavailable',
    tone: TrackTone.Unavailable,
    empty: 'detail.filterEmpty.unavailable'
  },
  {
    value: REMOTE_REMOVED,
    label: 'trackState.removedFromChip',
    tone: 'retained',
    empty: 'detail.filterEmpty.remoteRemoved'
  }
];

export function statusCount(
  value: TrackFilterState,
  counts: TrackFileStatusCounts,
  remoteRemoved: number
): number {
  return value === REMOTE_REMOVED ? remoteRemoved : counts[value];
}

export function statusChipCount(
  chip: StatusChip,
  counts: TrackFileStatusCounts,
  remoteRemoved: number
): number {
  return statusCount(chip.value, counts, remoteRemoved);
}

export function totalStatusCount(counts: TrackFileStatusCounts): number {
  return Object.values(TrackFileStatus).reduce(
    (sum, status) => sum + counts[status],
    0
  );
}

/* One rule for both rails: a state with nothing in it is not a filter worth
 * offering, except the one in force, so an empty view keeps its way back. The
 * retained view is hidden at zero even when it is the one in force. */
export function visibleStatusChips(
  counts: TrackFileStatusCounts,
  remoteRemoved: number,
  active: TrackFilterState | null
): readonly StatusChip[] {
  return STATUS_CHIPS.filter(chip =>
    chip.value === REMOTE_REMOVED
      ? remoteRemoved > 0
      : counts[chip.value] > 0 || chip.value === active
  );
}
