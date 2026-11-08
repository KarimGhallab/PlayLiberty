import {
  IconPencil,
  IconPhoto,
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
import {
  type PlaylistActionKey,
  deleteIntentFor,
  playlistActionsFor
} from '@playliberty/library';

import {
  useDeletePlaylist,
  useRemovePlaylistCover,
  useRenamePlaylist,
  useSetPlaylistCover,
  useSyncPlaylist,
  useUpdatePin
} from '@playliberty/api-client';
import { problemSentence } from '../api/problem/problem';
import CoverDialog from '../components/CoverDialog/CoverDialog';
import RenamePlaylistDialog from '../components/RenamePlaylistDialog';
import SharePlaylistDialog from '../components/SharePlaylistDialog/SharePlaylistDialog';
import type { PendingAction } from '../components/useDeferredAction/types';

/*
 * One module owns a surface's playlist actions: the mutations, the menu each
 * playlist is given, and the dialogs. A gallery reads it once rather than once
 * per item, so N items never multiply the observers or dialogs.
 */

export interface PlaylistAction {
  readonly key: PlaylistActionKey;
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
  /** The dialogs, for the page to place. */
  readonly dialogs: ReactNode;
  /** Start one playlist's sync. The same mutation the menu's Sync item runs. */
  readonly syncNow: (playlistId: string) => void;
  /** Whether this playlist's sync is in flight. */
  readonly syncing: (playlistId: string) => boolean;
}

export function usePlaylistActions(
  options: PlaylistActionsOptions
): PlaylistActions {
  const { t } = useI18n();
  const sync = useSyncPlaylist();
  const rename = useRenamePlaylist();
  const cover = useSetPlaylistCover();
  const removeCover = useRemovePlaylistCover();
  const remove = useDeletePlaylist();
  const pin = useUpdatePin();
  const [renameTarget, setRenameTarget] = useState<Playlist | null>(null);
  const [shareTarget, setShareTarget] = useState<Playlist | null>(null);
  const [coverTarget, setCoverTarget] = useState<Playlist | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);

  const menuFor = (
    playlist: Playlist | undefined
  ): readonly PlaylistAction[] => {
    if (playlist === undefined) {
      return [];
    }

    /*
     * The shared list decides which actions exist; this module owns the glyph
     * and the control each key draws.
     */
    return playlistActionsFor(playlist, {
      includePin: options.pin !== undefined
    }).map(action => {
      switch (action.key) {
        case 'pin':
          return {
            key: 'pin',
            label: action.label,
            Icon: playlist.pinned ? IconPinnedOff : IconPin,
            disabled:
              pin.isPending && pin.variables?.playlistId === playlist.id,
            onSelect: () => {
              if (options.pin === undefined) {
                return;
              }

              pin.mutate(
                { playlistId: playlist.id, pinned: !playlist.pinned },
                { onError: options.pin.onRefused }
              );
            }
          };
        case 'share':
          return {
            key: 'share',
            label: action.label,
            Icon: IconShare,
            onSelect: () => setShareTarget(playlist)
          };
        case 'rename':
          return {
            key: 'rename',
            label: action.label,
            Icon: IconPencil,
            onSelect: () => setRenameTarget(playlist)
          };
        case 'cover':
          return {
            key: 'cover',
            label: action.label,
            Icon: IconPhoto,
            disabled: cover.isPending || removeCover.isPending,
            onSelect: () => {
              cover.reset();
              removeCover.reset();
              setCoverTarget(playlist);
              setCoverOpen(true);
            }
          };
        case 'sync':
          return {
            key: 'sync',
            label: action.label,
            Icon: IconRotate,
            onSelect: () => sync.mutate(playlist.id),
            disabled: sync.isPending && sync.variables === playlist.id
          };
        case 'delete':
          return {
            key: 'delete',
            label: action.label,
            Icon: IconTrash,
            destructive: true,
            onSelect: () =>
              options.defer({
                ...deleteIntentFor(t, playlist, options.deleteMessage),
                commit: () =>
                  remove.mutate(playlist.id, { onSuccess: options.onDeleted })
              })
          };
      }
    });
  };

  /*
   * Mount the dialogs only while open: a gallery of closed items must not ask
   * the account directory or the reader's account anything.
   */
  const dialogs =
    renameTarget === null &&
    shareTarget === null &&
    coverTarget === null ? null : (
      <>
        {coverTarget === null ? null : (
          <CoverDialog
            open={coverOpen}
            playlist={coverTarget}
            isWorking={cover.isPending}
            isRemoving={removeCover.isPending}
            problem={cover.isError ? t('coverDialog.uploadFailed') : null}
            removeProblem={
              removeCover.isError ? t('coverDialog.removeFailed') : null
            }
            onSubmit={(file, crop) =>
              cover.mutate(
                { playlistId: coverTarget.id, file, crop },
                { onSuccess: () => setCoverOpen(false) }
              )
            }
            onRemove={() =>
              removeCover.mutate(coverTarget.id, {
                onSuccess: () => setCoverOpen(false)
              })
            }
            onClose={() => setCoverOpen(false)}
            onClosed={() => {
              setCoverTarget(null);
              cover.reset();
              removeCover.reset();
            }}
          />
        )}
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
