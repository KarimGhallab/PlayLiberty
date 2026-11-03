import { TrackFileStatus } from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { TrackTone } from '@playliberty/ui-foundation';

export interface StatusChip {
  readonly value: TrackFileStatus;
  readonly label: MessageKey<Messages>;
  readonly tone: TrackTone;
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
  }
];

export function totalStatusCount(counts: TrackFileStatusCounts): number {
  return STATUS_CHIPS.reduce((sum, chip) => sum + counts[chip.value], 0);
}

/* One rule for both rails: a state with nothing in it is not a filter worth
 * offering, except the one in force, so an empty view keeps its way back. */
export function visibleStatusChips(
  counts: TrackFileStatusCounts,
  active: TrackFileStatus | null
): readonly StatusChip[] {
  return STATUS_CHIPS.filter(
    chip => counts[chip.value] > 0 || chip.value === active
  );
}
