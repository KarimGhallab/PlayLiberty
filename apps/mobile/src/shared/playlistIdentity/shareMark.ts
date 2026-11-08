import {
  IconLock,
  IconLockShare,
  IconUserShare
} from '@tabler/icons-react-native';

import type { Playlist } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { ShareMarkState, shareMarkOf } from '@playliberty/ui-foundation';

import { tokenColor } from '../styles/tokens';

const ICONS: Record<ShareMarkState, typeof IconLock> = {
  [ShareMarkState.Collab]: IconUserShare,
  [ShareMarkState.OwnShared]: IconLockShare,
  [ShareMarkState.OwnPrivate]: IconLock
};

export interface ShareMark {
  readonly state: ShareMarkState;
  readonly label: MessageKey<Messages>;
  readonly Icon: typeof IconLock;
}

/* One glyph says you are not the owner, not what you may do. */
export function shareMark(playlist: Playlist): ShareMark {
  const mark = shareMarkOf(playlist);

  return { ...mark, Icon: ICONS[mark.state] };
}

/** A private playlist's mark is quiet; a shared or collaborator mark is not. */
export function shareMarkColor(mark: ShareMark): string {
  return mark.state === ShareMarkState.OwnPrivate
    ? tokenColor('muted')
    : tokenColor('shared');
}
