import {
  IconLock,
  IconLockShare,
  IconUserShare
} from '@tabler/icons-react-native';

import type { Playlist } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';

import { tokenColor } from '../styles/tokens';

export interface ShareMark {
  readonly label: MessageKey<Messages>;
  readonly Icon: typeof IconLock;
}

/* One glyph says you are not the owner, not what you may do. */
export function shareMark(playlist: Playlist): ShareMark {
  if (playlist.access !== 'owner') {
    return { label: 'header.collab', Icon: IconUserShare };
  }

  if (playlist.hasShares) {
    return { label: 'header.shared', Icon: IconLockShare };
  }

  return { label: 'header.private', Icon: IconLock };
}

/** A private playlist's mark is quiet; a shared or collaborator mark is not. */
export function shareMarkColor(mark: ShareMark): string {
  return mark.label === 'header.private'
    ? tokenColor('muted')
    : tokenColor('shared');
}
