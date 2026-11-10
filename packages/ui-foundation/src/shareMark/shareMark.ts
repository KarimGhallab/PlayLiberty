import type { Playlist } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';

export enum ShareMarkState {
  OwnPrivate = 'own-private',
  OwnShared = 'own-shared',
  Collab = 'collab'
}

export interface ShareMark {
  readonly state: ShareMarkState;
  readonly label: MessageKey<Messages>;
}

/* The indicator is deliberately coarser than the permission model: one glyph
 * says you are not the owner, not what you may do. */
export function shareMarkOf(
  playlist: Pick<Playlist, 'access' | 'hasShares'>
): ShareMark {
  if (playlist.access !== 'owner') {
    return { state: ShareMarkState.Collab, label: 'header.collab' };
  }

  if (playlist.hasShares) {
    return { state: ShareMarkState.OwnShared, label: 'header.shared' };
  }

  return { state: ShareMarkState.OwnPrivate, label: 'header.private' };
}
