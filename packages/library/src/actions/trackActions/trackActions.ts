import type { Track } from '@playliberty/contracts';
import { TrackFileStatus } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';

export type TrackActionKey = 'copy' | 'retry' | 'fetchWhole' | 'remove';

export interface TrackAction {
  readonly key: TrackActionKey;
  readonly label: MessageKey<Messages>;
}

const COPY: TrackAction = { key: 'copy', label: 'trackRow.copyLink' };

/* Copy link is universal. Retry and Fetch whole are the write collaborator's
 * failed-track repairs, and Remove is the write collaborator's curation; a busy
 * row keeps only Copy link. */
export function trackActionsFor(
  track: Track,
  canWrite: boolean,
  skipNonMusic: boolean,
  busy: boolean
): readonly TrackAction[] {
  if (busy || !canWrite) {
    return [COPY];
  }

  const actions: TrackAction[] = [COPY];

  if (track.fileStatus === TrackFileStatus.Failed) {
    actions.push({ key: 'retry', label: 'trackRow.retry' });

    if (skipNonMusic) {
      actions.push({ key: 'fetchWhole', label: 'trackRow.fetchWhole' });
    }
  }

  actions.push({ key: 'remove', label: 'trackRow.remove' });

  return actions;
}
