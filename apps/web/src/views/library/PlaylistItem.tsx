import { useNavigate } from '@tanstack/react-router';

import type { PlaylistWithCounts } from '@playliberty/contracts';

import PlaylistCardHeader from '../../shared/components/PlaylistHeader/PlaylistCardHeader';
import PlaylistTileHeader from '../../shared/components/PlaylistHeader/PlaylistTileHeader';
import { hasPlayableTrack } from '../../shared/player/playable';
import { usePlayerStore } from '../../shared/player/playerStore/playerStore';
import { queuePlaylistId } from '../../shared/player/types';
import type { PlaylistAction } from '../../shared/playlistActions/playlistActions';

import IncompleteBadge from './IncompleteBadge/IncompleteBadge';

/*
 * The item draws the menu its page projected for it. It owns no action, dialog
 * or observer, so a gallery of N items still has one actions module.
 */

interface PlaylistItemProps {
  playlist: PlaylistWithCounts;
  ownerName: string | null;
  /* Whether a deferred action is about to remove this playlist. */
  pending: boolean;
  layout: 'tile' | 'card';
  /* The actions the page's one module projects for this playlist. */
  menu: readonly PlaylistAction[];
  /* Start this playlist in its own order, or pause and resume its own queue. */
  onPlay: () => void;
  /* Start this playlist, shuffled, or turn its shuffle off. */
  onShuffle: () => void;
}

export default function PlaylistItem({
  playlist,
  ownerName,
  pending,
  layout,
  menu,
  onPlay,
  onShuffle
}: PlaylistItemProps) {
  const navigate = useNavigate();
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

  if (isCard) {
    return <PlaylistCardHeader {...shared} item menu={menu} onPlay={onPlay} />;
  }

  return (
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
  );
}
