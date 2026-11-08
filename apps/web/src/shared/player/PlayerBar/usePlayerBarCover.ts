import type { Playlist } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';

import { usePlaylist } from '@playliberty/api-client';
import { mediaUrl } from '../../api/endpoints/endpoints';
import { usePlayerStore } from '../playerStore/playerStore';
import { currentTrack } from '../types';

/*
 * The cover behind the bar: the playlist's custom image, then its cover track,
 * then the playing track's own artwork. A surface with no image leaves the
 * sleeve fallback to the bar.
 */
function coverOf(playlist: Playlist | undefined): string | null {
  if (playlist === undefined) {
    return null;
  }

  if (playlist.coverUpdatedAt !== null) {
    const path = mediaUrl(endpoints.playlistCover, {
      playlistId: playlist.id
    });

    return `${path}?v=${encodeURIComponent(playlist.coverUpdatedAt)}`;
  }

  if (playlist.coverTrackId !== null) {
    return mediaUrl(endpoints.trackThumbnail, {
      trackId: playlist.coverTrackId
    });
  }

  return null;
}

export function usePlayerBarCover(): string | null {
  const current = usePlayerStore(currentTrack);
  const playlist = usePlaylist(current?.playlistId ?? null);
  const playlistCover = coverOf(playlist.data);

  if (playlistCover !== null) {
    return playlistCover;
  }

  if (current === null || current.thumbnailPath === null) {
    return null;
  }

  return mediaUrl(endpoints.trackThumbnail, { trackId: current.id });
}
