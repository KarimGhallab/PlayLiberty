import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import type { Playlist } from '@playliberty/contracts';

import { ApiError } from '../../shared/api/client/client';
import {
  useDeletePlaylist,
  useRenamePlaylist,
  useSyncPlaylist
} from '../../shared/api/queries/queries';
import PlaylistHeader from '../../shared/components/PlaylistHeader/PlaylistHeader';
import RenamePlaylistDialog from '../../shared/components/RenamePlaylistDialog';
import SharePlaylistDialog from '../../shared/components/SharePlaylistDialog/SharePlaylistDialog';
import type { PendingAction } from '../../shared/components/useDeferredAction/useDeferredAction';
import { usePlayerStore } from '../../shared/player/playerStore/playerStore';

/*
 * One item in the library: the shared playlist header with this item's own
 * actions wired. It exists as a component rather than as markup in the page
 * because the mutations are per playlist: `useSyncPlaylist`, `useRenamePlaylist`
 * and `useDeletePlaylist` each take one id, and a hook cannot be called in a
 * loop. The item owns its two dialogs and mounts each only while it is open, so
 * a gallery of fifty closed items asks the account directory no questions.
 *
 * The delete is the one action the item does not own. It hands the page a
 * deferred action carrying its own commit, so the page keeps a single undo
 * window and a second delete replaces the first rather than raising a second
 * toast, which is the rule `useDeferredAction` states.
 *
 * What is offered follows `access`, and the header enforces the same gates by
 * absence: a write collaborator gets Sync now and no Share, Rename or Delete,
 * and a read collaborator gets no overflow at all. Shuffle is the one control
 * every item carries, because it is a property of playback and not of a playlist.
 * The item does not own its action, because the press starts a queue from tracks
 * this screen has not read and may have to refuse; the page's `onShuffle` owns
 * both, and the item reads the flag and the queue's playlist only to press the
 * control on the row the queue belongs to.
 */

interface PlaylistListItemProps {
  playlist: Playlist;
  ownerName: string | null;
  /* Whether a deferred action is about to remove this playlist. */
  pending: boolean;
  /* Open the page's one deferred-action window. */
  defer: (action: PendingAction) => void;
  /* Start this playlist, shuffled, or turn its shuffle off. */
  onShuffle: () => void;
}

export default function PlaylistListItem({
  playlist,
  ownerName,
  pending,
  defer,
  onShuffle
}: PlaylistListItemProps) {
  const navigate = useNavigate();
  const sync = useSyncPlaylist(playlist.id);
  const rename = useRenamePlaylist(playlist.id);
  const remove = useDeletePlaylist(playlist.id);
  const [renameOpen, setRenameOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shuffled = usePlayerStore(state => state.shuffle);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const queuePlaylistId = usePlayerStore(
    state => state.queue[0]?.playlistId ?? null
  );

  const owner = playlist.access === 'owner';
  const canSync = owner || playlist.access === 'write';
  const isQueue = queuePlaylistId === playlist.id;

  return (
    <>
      <PlaylistHeader
        playlist={playlist}
        ownerName={ownerName}
        showSyncTime
        onOpen={() => {
          void navigate({
            to: '/playlists/$playlistId',
            params: { playlistId: playlist.id }
          });
        }}
        onShuffle={onShuffle}
        ground
        current={isQueue}
        playing={isQueue && isPlaying}
        pending={pending}
        shuffled={shuffled}
        onSync={canSync ? () => sync.mutate() : undefined}
        syncing={sync.isPending}
        onShare={owner ? () => setShareOpen(true) : undefined}
        onRename={owner ? () => setRenameOpen(true) : undefined}
        onDelete={
          owner
            ? () =>
                defer({
                  id: playlist.id,
                  message: 'Deleting playlist',
                  detail: playlist.name,
                  commit: () => remove.mutate()
                })
            : undefined
        }
      />

      {renameOpen ? (
        <RenamePlaylistDialog
          open
          currentName={playlist.name}
          isWorking={rename.isPending}
          problem={
            rename.isError && rename.error instanceof ApiError
              ? (rename.error.problem?.detail ?? null)
              : null
          }
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
}
