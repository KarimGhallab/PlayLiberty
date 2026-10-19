import { useNavigate } from '@tanstack/react-router';

import type { PlaylistWithCounts } from '@playliberty/contracts';

import PlaylistCardHeader from '../../shared/components/PlaylistHeader/PlaylistCardHeader';
import PlaylistTileHeader from '../../shared/components/PlaylistHeader/PlaylistTileHeader';
import type { PendingAction } from '../../shared/components/useDeferredAction/useDeferredAction';
import { hasPlayableTrack } from '../../shared/player/playable';
import { usePlayerStore } from '../../shared/player/playerStore/playerStore';
import { queuePlaylistId } from '../../shared/player/types';
import { usePlaylistActions } from '../../shared/playlistActions/playlistActions';

import IncompleteBadge from './IncompleteBadge/IncompleteBadge';

/*
 * A component rather than markup in the page because the actions module is a
 * hook and a hook cannot be called in a loop. The delete is the one action the
 * item does not own: it hands the page its commit, so one undo window holds it.
 */

interface PlaylistItemProps {
  playlist: PlaylistWithCounts;
  ownerName: string | null;
  /* Whether a deferred action is about to remove this playlist. */
  pending: boolean;
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
    playable: hasPlayableTrack(playlist),
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
