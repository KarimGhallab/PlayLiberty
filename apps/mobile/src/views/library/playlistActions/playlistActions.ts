import type { PlaylistWithCounts } from '@playliberty/contracts';
import type { MessageKey, Messages, Translator } from '@playliberty/i18n';

export type PlaylistActionKey =
  'pin' | 'share' | 'rename' | 'cover' | 'sync' | 'delete';

export const UNDO_WINDOW_MS = 6000;

export interface PlaylistAction {
  readonly key: PlaylistActionKey;
  readonly label: MessageKey<Messages>;
}

/* Visibility alone grants the pin, so every access level holds it; the rest are
 * the writes, and an owner's delete. */
export function playlistActionsFor(
  playlist: PlaylistWithCounts
): readonly PlaylistAction[] {
  const pin: PlaylistAction = {
    key: 'pin',
    label: playlist.pinned ? 'header.unpin' : 'header.pin'
  };

  if (playlist.access === 'owner') {
    return [
      pin,
      { key: 'share', label: 'header.share' },
      { key: 'rename', label: 'header.rename' },
      { key: 'cover', label: 'header.cover' },
      { key: 'sync', label: 'header.syncNow' },
      { key: 'delete', label: 'header.delete' }
    ];
  }

  if (playlist.access === 'write') {
    return [
      pin,
      { key: 'cover', label: 'header.cover' },
      { key: 'sync', label: 'header.syncNow' }
    ];
  }

  return [pin];
}

export interface DeleteIntent {
  readonly id: string;
  readonly message: string;
  readonly detail: string;
}

export function deleteIntentFor(
  t: Translator<Messages>,
  playlist: PlaylistWithCounts
): DeleteIntent {
  return {
    id: playlist.id,
    message: t('library.deleteDeferred'),
    detail: playlist.name
  };
}
