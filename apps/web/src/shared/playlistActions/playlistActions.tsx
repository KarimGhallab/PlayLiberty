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
import type { PendingAction } from '../components/useDeferredAction/useDeferredAction';

/*
 * One module owns a playlist's actions: which of pin, share, rename, sync and
 * delete an account may perform, the menu, and the effects, so the two surfaces
 * share it. `playlistId` is separate: the id precedes the playlist's load.
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
  /** The items the header draws, gated by access; empty for a reader. */
  readonly menu: readonly PlaylistAction[];
  /** The rename and share dialogs, for the consumer to place. */
  readonly dialogs: ReactNode;
  /** Start a sync. The same mutation the menu's Sync now item runs. */
  readonly syncNow: () => void;
  readonly syncing: boolean;
  /** Whether the account may write: the owner or a write collaborator. */
  readonly canWrite: boolean;
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
  playlistId: string,
  playlist: Playlist | undefined,
  options: PlaylistActionsOptions
): PlaylistActions {
  const { t } = useI18n();
  const sync = useSyncPlaylist(playlistId);
  const rename = useRenamePlaylist(playlistId);
  const remove = useDeletePlaylist(playlistId);
  const pin = useUpdatePin(playlistId);
  const [renameOpen, setRenameOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const access = playlist?.access ?? null;
  const canWrite = canWritePlaylist(playlist);

  const syncItem = (): PlaylistAction => ({
    key: 'sync',
    label: 'header.syncNow',
    Icon: IconRotate,
    onSelect: () => sync.mutate(),
    disabled: sync.isPending
  });

  /*
   * The delete opens the consumer's undo window; an unloaded playlist has no
   * name to defer, so the item is absent.
   */
  const deleteItem = (): PlaylistAction | null => {
    if (playlist === undefined) {
      return null;
    }

    return {
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
            remove.mutate(undefined, { onSuccess: options.onDeleted })
        })
    };
  };

  const menu: PlaylistAction[] = [];

  /*
   * Visibility alone grants the pin, so every menu holds it, a reader's alone.
   * Its key stays `pin` while its label toggles, so the control never moves.
   */
  const pinItem = (): PlaylistAction | null => {
    if (playlist === undefined || options.pin === undefined) {
      return null;
    }

    const refused = options.pin.onRefused;

    return {
      key: 'pin',
      label: playlist.pinned ? 'header.unpin' : 'header.pin',
      Icon: playlist.pinned ? IconPinnedOff : IconPin,
      disabled: pin.isPending,
      onSelect: () => pin.mutate(!playlist.pinned, { onError: refused })
    };
  };

  const pinEntry = pinItem();

  if (access === 'owner') {
    if (pinEntry !== null) {
      menu.push(pinEntry);
    }

    menu.push(
      {
        key: 'share',
        label: 'header.share',
        Icon: IconShare,
        onSelect: () => setShareOpen(true)
      },
      {
        key: 'rename',
        label: 'header.rename',
        Icon: IconPencil,
        onSelect: () => setRenameOpen(true)
      },
      syncItem()
    );

    const del = deleteItem();
    if (del !== null) {
      menu.push(del);
    }
  } else if (access === 'write') {
    if (pinEntry !== null) {
      menu.push(pinEntry);
    }

    menu.push(syncItem());
  } else if (access === 'read') {
    if (pinEntry !== null) {
      menu.push(pinEntry);
    }
  }

  /*
   * Mount the dialogs only while open: a gallery of closed items must not ask
   * the account directory or the reader's account anything.
   */
  const dialogs =
    playlist === undefined ? null : (
      <>
        {renameOpen ? (
          <RenamePlaylistDialog
            open
            currentName={playlist.name}
            isWorking={rename.isPending}
            problem={rename.isError ? problemSentence(t, rename.error) : null}
            onSubmit={name =>
              rename.mutate(name, { onSuccess: () => setRenameOpen(false) })
            }
            onClose={() => setRenameOpen(false)}
          />
        ) : null}
        {shareOpen ? (
          <SharePlaylistDialog
            open
            playlistId={playlist.id}
            onClose={() => setShareOpen(false)}
          />
        ) : null}
      </>
    );

  return {
    menu,
    dialogs,
    syncNow: () => sync.mutate(),
    syncing: sync.isPending,
    canWrite
  };
}
