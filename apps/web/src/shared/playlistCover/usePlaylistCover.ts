import { useEffect, useState } from 'react';

import type { Playlist } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';

import { mediaUrl } from '../api/endpoints/endpoints';

enum CoverFailure {
  None = 'none',
  Custom = 'custom',
  Track = 'track'
}

/* The custom image carries its version, so a replacement is a new cache key. */
function customCoverUrl(playlist: Playlist): string | null {
  if (playlist.coverUpdatedAt === null) {
    return null;
  }

  const path = mediaUrl(endpoints.playlistCover, { playlistId: playlist.id });

  return `${path}?v=${encodeURIComponent(playlist.coverUpdatedAt)}`;
}

export interface PlaylistCover {
  readonly cover: string | null;
  readonly onCoverError: () => void;
}

/* The custom, first-track, sleeve chain every surface that draws a playlist
 * cover shares, so their failure states cannot drift. */
export function usePlaylistCover(
  playlist: Playlist,
  includeCustom = true
): PlaylistCover {
  const customCoverSrc = includeCustom ? customCoverUrl(playlist) : null;
  const trackCoverSrc =
    playlist.coverTrackId === null
      ? null
      : mediaUrl(endpoints.trackThumbnail, { trackId: playlist.coverTrackId });
  const [coverFailure, setCoverFailure] = useState(CoverFailure.None);
  const showingCustom =
    customCoverSrc !== null && coverFailure === CoverFailure.None;
  const cover = showingCustom
    ? customCoverSrc
    : coverFailure === CoverFailure.Track
      ? null
      : trackCoverSrc;

  /* The image has no source to name, so the failure state names which level
   * failed: the custom image first, then the track thumbnail, then the sleeve. */
  const onCoverError = () =>
    setCoverFailure(showingCustom ? CoverFailure.Custom : CoverFailure.Track);

  useEffect(() => {
    setCoverFailure(CoverFailure.None);
  }, [playlist.coverUpdatedAt, playlist.coverTrackId, includeCustom]);

  return { cover, onCoverError };
}
