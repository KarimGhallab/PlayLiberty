import {
  IconPencil,
  IconPin,
  IconPinnedOff,
  IconRotate,
  IconShare,
  IconTrash
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import type { Playlist } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import { problemSentence } from '../api/problem/problem';
import {
  useDeletePlaylist,
  useRenamePlaylist,
  useSyncPlaylist,
  useUpdatePin
} from '../api/queries/queries';
import RenamePlaylistDialog from '../components/RenamePlaylistDialog';
import SharePlaylistDialog from '../components/SharePlaylistDialog/SharePlaylistDialog';
import type { PendingAction } from '../components/useDeferredAction/types';

/*
 * One module owns a surface's playlist actions: the four mutations, the menu
 * each playlist is given, and the two dialogs. A gallery reads it once rather
 * than once per item, so N items never multiply the observers or dialogs.
 */

export interface PlaylistAction {
  readonly key: 'pin' | 'share' | 'rename' | 'sync' | 'delete';
  readonly label: MessageKey<Messages>;
  readonly Icon: typeof IconShare;
  readonly onSelect: () => void;
  readonly destructive?: true;
  readonly disabled?: boolean;
}

export interface PlaylistActionsOptions {
  /** The consumer's one deferred-action window, which the delete opens. */
  readonly defer: (action: PendingAction) => void;
  /** The sentence the delete toast shows, which differs by surface. */
  readonly deleteMessage: MessageKey<Messages>;
  /** Runs after the delete commits, for a consumer leaving the route. */
  readonly onDeleted?: () => void;
  /*
   * The library's own action: present puts Pin or Unpin on the menu and hands a
   * failed write to the surface, which owns the notice; absent on the detail.
   */
  readonly pin?: {
    readonly onRefused: (error: Error) => void;
  };
}

export interface PlaylistActions {
  /** The items one playlist's header draws, gated by access; empty before it loads. */
  readonly menuFor: (
    playlist: Playlist | undefined
  ) => readonly PlaylistAction[];
  /** The rename and share dialogs, for the page to place. */
  readonly dialogs: ReactNode;
  /** Start one playlist's sync. The same mutation the menu's Sync now item runs. */
  readonly syncNow: (playlistId: string) => void;
  /** Whether this playlist's sync is in flight. */
  readonly syncing: (playlistId: string) => boolean;
}

/*
 * Whether the account may write: it owns the playlist or holds a write share;
 * an unloaded one is not writable. Exported so the menu and detail agree.
 */
export function canWritePlaylist(playlist: Playlist | undefined): boolean {
  const access = playlist?.access ?? null;

  return access === 'owner' || access === 'write';
}

export function usePlaylistActions(
  options: PlaylistActionsOptions
): PlaylistActions {
  const { t } = useI18n();
  const sync = useSyncPlaylist();
  const rename = useRenamePlaylist();
  const remove = useDeletePlaylist();
  const pin = useUpdatePin();
  const [renameTarget, setRenameTarget] = useState<Playlist | null>(null);
  const [shareTarget, setShareTarget] = useState<Playlist | null>(null);

  const menuFor = (
    playlist: Playlist | undefined
  ): readonly PlaylistAction[] => {
    if (playlist === undefined) {
      return [];
    }

    const access = playlist.access;
    const menu: PlaylistAction[] = [];

    /*
     * Visibility alone grants the pin, so every menu holds it, a reader's alone.
     * Its key stays `pin` while its label toggles, so the control never moves.
     */
    const pinItem = (): PlaylistAction | null => {
      if (options.pin === undefined) {
        return null;
      }

      const refused = options.pin.onRefused;

      return {
        key: 'pin',
        label: playlist.pinned ? 'header.unpin' : 'header.pin',
        Icon: playlist.pinned ? IconPinnedOff : IconPin,
        disabled: pin.isPending && pin.variables?.playlistId === playlist.id,
        onSelect: () =>
          pin.mutate(
            { playlistId: playlist.id, pinned: !playlist.pinned },
            { onError: refused }
          )
      };
    };

    const syncItem = (): PlaylistAction => ({
      key: 'sync',
      label: 'header.syncNow',
      Icon: IconRotate,
      onSelect: () => sync.mutate(playlist.id),
      disabled: sync.isPending && sync.variables === playlist.id
    });

    if (access === 'owner') {
      const pinEntry = pinItem();
      if (pinEntry !== null) {
        menu.push(pinEntry);
      }

      menu.push(
        {
          key: 'share',
          label: 'header.share',
          Icon: IconShare,
          onSelect: () => setShareTarget(playlist)
        },
        {
          key: 'rename',
          label: 'header.rename',
          Icon: IconPencil,
          onSelect: () => setRenameTarget(playlist)
        },
        syncItem(),
        {
          key: 'delete',
          label: 'header.delete',
          Icon: IconTrash,
          destructive: true,
          onSelect: () =>
            options.defer({
              id: playlist.id,
              message: t(options.deleteMessage),
              detail: playlist.name,
              commit: () =>
                remove.mutate(playlist.id, { onSuccess: options.onDeleted })
            })
        }
      );
    } else if (access === 'write') {
      const pinEntry = pinItem();
      if (pinEntry !== null) {
        menu.push(pinEntry);
      }

      menu.push(syncItem());
    } else if (access === 'read') {
      const pinEntry = pinItem();
      if (pinEntry !== null) {
        menu.push(pinEntry);
      }
    }

    return menu;
  };

  /*
   * Mount the dialogs only while open: a gallery of closed items must not ask
   * the account directory or the reader's account anything.
   */
  const dialogs =
    renameTarget === null && shareTarget === null ? null : (
      <>
        {renameTarget === null ? null : (
          <RenamePlaylistDialog
            open
            currentName={renameTarget.name}
            isWorking={rename.isPending}
            problem={rename.isError ? problemSentence(t, rename.error) : null}
            onSubmit={name =>
              rename.mutate(
                { playlistId: renameTarget.id, name },
                { onSuccess: () => setRenameTarget(null) }
              )
            }
            onClose={() => setRenameTarget(null)}
          />
        )}
        {shareTarget === null ? null : (
          <SharePlaylistDialog
            open
            playlistId={shareTarget.id}
            onClose={() => setShareTarget(null)}
          />
        )}
      </>
    );

  return {
    menuFor,
    dialogs,
    syncNow: playlistId => sync.mutate(playlistId),
    syncing: playlistId => sync.isPending && sync.variables === playlistId
  };
}
