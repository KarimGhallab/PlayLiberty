import { useNavigate } from '@tanstack/react-router';

import type { PlaylistWithCounts } from '@playliberty/contracts';

import PlaylistTileHeader from '../../shared/components/PlaylistHeader/PlaylistTileHeader';
import type { PendingAction } from '../../shared/components/useDeferredAction/useDeferredAction';
import { usePlayerStore } from '../../shared/player/playerStore/playerStore';
import { queuePlaylistId } from '../../shared/player/types';
import { usePlaylistActions } from '../../shared/playlistActions/playlistActions';

import IncompleteBadge from './IncompleteBadge/IncompleteBadge';

/*
 * One tile in the library: the header's tile arrangement with this item's own
 * wiring. It is a component rather than markup in the page for the reason the item
 * before it was: the actions module is a hook, and a hook cannot be called in a
 * loop.
 *
 * The delete is the one action the tile does not own. It hands the page a deferred
 * action carrying its own commit, so the page keeps a single undo window and a
 * second delete replaces the first rather than raising a second toast. Shuffle is
 * a property of playback and not of a playlist, so the item reads the store only
 * to press the control on the row the queue belongs to.
 *
 * The mark is the library's own, which is why it is passed in rather than drawn by
 * the header: the counts come from the list the gallery holds.
 */

interface PlaylistTileProps {
  playlist: PlaylistWithCounts;
  ownerName: string | null;
  /* Whether a deferred action is about to remove this playlist. */
  pending: boolean;
  /* Open the page's one deferred-action window. */
  defer: (action: PendingAction) => void;
  /* Start this playlist, shuffled, or turn its shuffle off. */
  onShuffle: () => void;
}

export default function PlaylistTile({
  playlist,
  ownerName,
  pending,
  defer,
  onShuffle
}: PlaylistTileProps) {
  const navigate = useNavigate();
  const { menu, dialogs } = usePlaylistActions(playlist.id, playlist, {
    defer,
    deleteMessage: 'library.deleteDeferred'
  });
  const shuffled = usePlayerStore(state => state.shuffle);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const isQueue = usePlayerStore(queuePlaylistId) === playlist.id;

  return (
    <>
      <PlaylistTileHeader
        playlist={playlist}
        ownerName={ownerName}
        pending={pending}
        current={isQueue}
        playing={isQueue && isPlaying}
        mark={<IncompleteBadge counts={playlist.counts} />}
        onShuffle={onShuffle}
        shuffled={shuffled}
        menu={menu}
        onOpen={() => {
          void navigate({
            to: '/playlists/$playlistId',
            params: { playlistId: playlist.id }
          });
        }}
      />
      {dialogs}
    </>
  );
}
