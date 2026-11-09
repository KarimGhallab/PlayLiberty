import { PlaylistSyncStatus } from '@playliberty/contracts';

import { tokenColor } from '../styles/tokens/tokens';

/** The sync word's tone: emphasis while working, the failed tone on a break. */
export function syncStateColor(status: PlaylistSyncStatus): string {
  if (status === PlaylistSyncStatus.Syncing) {
    return tokenColor('emphasis');
  }

  if (
    status === PlaylistSyncStatus.Error ||
    status === PlaylistSyncStatus.Blocked
  ) {
    return tokenColor('tone-failed');
  }

  return tokenColor('muted');
}
