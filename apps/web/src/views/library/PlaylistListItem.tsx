import { useNavigate } from '@tanstack/react-router';

import type { Playlist } from '@playliberty/contracts';

import PlaylistRowHeader from '../../shared/components/PlaylistHeader/PlaylistRowHeader';
import type { PendingAction } from '../../shared/components/useDeferredAction/useDeferredAction';
import { usePlayerStore } from '../../shared/player/playerStore/playerStore';
import { usePlaylistActions } from '../../shared/playlistActions/playlistActions';

/*
 * One item in the library: the shared playlist header with this item's own
 * actions wired. It exists as a component rather than as markup in the page
 * because the actions are per playlist: the actions module is a hook, and a hook
 * cannot be called in a loop.
 *
 * The delete is the one action the item does not own. It hands the page a
 * deferred action carrying its own commit, so the page keeps a single undo
 * window and a second delete replaces the first rather than raising a second
 * toast, which is the rule `useDeferredAction` states. The actions module builds
 * the menu by access and owns the dialogs, so the item no longer restates which
 * item a writer may use nor mounts a dialog of its own.
 *
 * Shuffle is the one control every item carries, because it is a property of
 * playback and not of a playlist. The item does not own its action, because the
 * press starts a queue from tracks this screen has not read and may have to
 * refuse; the page's `onShuffle` owns both, and the item reads the flag and the
 * queue's playlist only to press the control on the row the queue belongs to.
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
  const { menu, dialogs } = usePlaylistActions(playlist.id, playlist, {
    defer,
    deleteMessage: 'library.deleteDeferred'
  });
  const shuffled = usePlayerStore(state => state.shuffle);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const queuePlaylistId = usePlayerStore(
    state => state.queue[0]?.playlistId ?? null
  );

  const isQueue = queuePlaylistId === playlist.id;

  return (
    <>
      <PlaylistRowHeader
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
        menu={menu}
      />
      {dialogs}
    </>
  );
}
