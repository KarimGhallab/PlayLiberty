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
 * One module owns a playlist's actions: the owner/writer rule that decides which
 * of pin, share, rename, sync and delete an account may perform, the menu the
 * header draws, and the effects behind each item. The library item and the detail
 * page hand a playlist in and take the menu and the dialogs back, so neither
 * re-derives the rule nor re-wires the effects.
 *
 * Two things stay with the consumer because they genuinely differ. The undo
 * window is the surface's, because the library keeps one for the whole gallery
 * and the detail keeps its own; the module hands the delete to it. And leaving
 * the gone route is the detail's, so the module takes an `onDeleted` that runs
 * after the delete commits.
 *
 * `playlistId` is separate from `playlist` because the detail's route carries the
 * id before the playlist has loaded: the mutations are keyed by the id and are
 * ready, while the rule and the delete's name wait for the playlist.
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
  /** Runs after the delete commits, for a consumer that must leave the route. */
  readonly onDeleted?: () => void;
  /*
   * The pin, which is the library's own action. Present puts Pin or Unpin on the
   * menu and hands a failed write back to the surface, which owns the notice;
   * absent, as on the detail, leaves the menu without it.
   */
  readonly pin?: {
    readonly onRefused: (error: Error) => void;
  };
}

export interface PlaylistActions {
  /** The items the header draws, already gated by access. Empty for a reader. */
  readonly menu: readonly PlaylistAction[];
  /** The rename and share dialogs, for the consumer to place. */
  readonly dialogs: ReactNode;
  /** Start a sync. The same mutation the menu's Sync now item runs. */
  readonly syncNow: () => void;
  /** Whether that sync is in flight. */
  readonly syncing: boolean;
  /** Whether the account may write: the owner or a write collaborator. */
  readonly canWrite: boolean;
}

/*
 * Whether the account may write to a playlist: it owns it or holds a write
 * share. A playlist that has not loaded is not writable, which is the same
 * answer a reader gets. It is exported so the menu's gating here and the
 * detail's writable set are one rule rather than two that must agree.
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
   * The delete is the one item the module cannot finish on its own: it opens the
   * consumer's undo window, and the commit leaves the route only where the
   * consumer says so. A playlist that has not loaded has no name to defer, so the
   * item is absent rather than opening a toast that names nothing.
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
   * The pin is on the two menus that exist, and never on a reader's: a reader
   * gets no overflow at all and reaches the pin from the cover control instead.
   * The item is one toggle: its label and glyph are the action, and the model's
   * own key stays `pin` so the control that pressed it never moves.
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
  }

  /*
   * The dialogs are mounted only while open, which is the library's rule: a
   * gallery of fifty closed items must not ask the account directory or the
   * reader's own account any questions.
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
