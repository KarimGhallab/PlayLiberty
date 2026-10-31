import type { Track } from '@playliberty/contracts';
import { TrackFileStatus } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';

export type TrackActionKey = 'copy' | 'retry' | 'fetchWhole';

export interface TrackAction {
  readonly key: TrackActionKey;
  readonly label: MessageKey<Messages>;
}

const COPY: TrackAction = { key: 'copy', label: 'trackRow.copyLink' };

/* Copy link is universal. Retry and Fetch whole are the write collaborator's
 * failed-track repairs; a busy row keeps only Copy link. */
export function trackActionsFor(
  track: Track,
  canWrite: boolean,
  skipNonMusic: boolean,
  busy: boolean
): readonly TrackAction[] {
  if (busy || !canWrite || track.fileStatus !== TrackFileStatus.Failed) {
    return [COPY];
  }

  const actions: TrackAction[] = [
    COPY,
    { key: 'retry', label: 'trackRow.retry' }
  ];

  if (skipNonMusic) {
    actions.push({ key: 'fetchWhole', label: 'trackRow.fetchWhole' });
  }

  return actions;
}
