import { useNavigate } from '@tanstack/react-router';

import type { PlaylistWithCounts } from '@playliberty/contracts';

import PlaylistCardHeader from '../../shared/components/PlaylistHeader/PlaylistCardHeader';
import PlaylistTileHeader from '../../shared/components/PlaylistHeader/PlaylistTileHeader';
import type { PendingAction } from '../../shared/components/useDeferredAction/useDeferredAction';
import { usePlayerStore } from '../../shared/player/playerStore/playerStore';
import { queuePlaylistId } from '../../shared/player/types';
import { usePlaylistActions } from '../../shared/playlistActions/playlistActions';

import IncompleteBadge from './IncompleteBadge/IncompleteBadge';

/*
 * One item in the library: the header at the arrangement the page's width asks
 * for, with this item's own wiring. It is a component rather than markup in the
 * page for the reason the item before it was: the actions module is a hook, and a
 * hook cannot be called in a loop.
 *
 * The two arrangements are the header's own and this component chooses between
 * them rather than drawing both: a tile above the phone breakpoint, where the
 * gallery is artwork in columns, and a card at it and below, where a tile per row
 * is a playlist per screen. Both play: the tile from the corner of its cover and
 * the card from its band, because both lead with artwork and a press on artwork
 * should start it.
 *
 * The delete is the one action an item does not own. It hands the page a deferred
 * action carrying its own commit, so the page keeps a single undo window and a
 * second delete replaces the first rather than raising a second toast. Both
 * arrangements carry the overflow the actions module builds: the tile in its
 * actions row, and the card on the cover's top-right corner, which is a shortcut to
 * the same actions the playlist itself offers.
 *
 * Shuffle is a property of playback and not of a playlist, so the item reads the
 * store only to press the controls on the item the queue belongs to.
 *
 * The mark is the library's own, which is why it is passed in rather than drawn by
 * the header: the counts come from the list the gallery holds.
 */

interface PlaylistItemProps {
  playlist: PlaylistWithCounts;
  ownerName: string | null;
  /* Whether a deferred action is about to remove this playlist. */
  pending: boolean;
  /* Which arrangement the page's width asks for. */
  layout: 'tile' | 'card';
  /* Open the page's one deferred-action window. */
  defer: (action: PendingAction) => void;
  /* Start this playlist in its own order, or pause and resume its own queue. */
  onPlay: () => void;
  /* Start this playlist, shuffled, or turn its shuffle off. */
  onShuffle: () => void;
  /* The page's notice surface, which a failed pin opens. */
  onPinRefused: (error: Error) => void;
}

export default function PlaylistItem({
  playlist,
  ownerName,
  pending,
  layout,
  defer,
  onPlay,
  onShuffle,
  onPinRefused
}: PlaylistItemProps) {
  const navigate = useNavigate();
  const { menu, dialogs } = usePlaylistActions(playlist.id, playlist, {
    defer,
    deleteMessage: 'library.deleteDeferred',
    pin: { onRefused: onPinRefused }
  });
  const shuffled = usePlayerStore(state => state.shuffle);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const isQueue = usePlayerStore(queuePlaylistId) === playlist.id;
  const isCard = layout === 'card';

  const shared = {
    playlist,
    ownerName,
    pending,
    current: isQueue,
    playing: isQueue && isPlaying,
    mark: (
      <IncompleteBadge
        counts={playlist.counts}
        tipEdge={isCard ? 'end' : 'start'}
      />
    ),
    onShuffle,
    shuffled
  };

  return (
    <>
      {isCard ? (
        <PlaylistCardHeader {...shared} item menu={menu} onPlay={onPlay} />
      ) : (
        <PlaylistTileHeader
          {...shared}
          menu={menu}
          onPlay={onPlay}
          onOpen={() => {
            void navigate({
              to: '/playlists/$playlistId',
              params: { playlistId: playlist.id }
            });
          }}
        />
      )}
      {dialogs}
    </>
  );
}
