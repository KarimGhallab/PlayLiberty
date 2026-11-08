import { useEffect, useState } from 'react';

import type { Playlist } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import {
  CoverFailure,
  coverChainKey,
  nextCoverFailure,
  selectPlaylistCover
} from '@playliberty/ui-foundation';

import { mediaUrl } from '../api/endpoints/endpoints';

/* The custom image carries its version, so a replacement is a new cache key. */
function customCoverPath(playlist: Playlist): string | null {
  if (playlist.coverUpdatedAt === null) {
    return null;
  }

  return mediaUrl(endpoints.playlistCover, { playlistId: playlist.id });
}

function trackCoverPath(playlist: Playlist): string | null {
  if (playlist.coverTrackId === null) {
    return null;
  }

  return mediaUrl(endpoints.trackThumbnail, {
    trackId: playlist.coverTrackId
  });
}

function withVersion(path: string, version: string | null): string {
  return version === null
    ? path
    : `${path}?v=${encodeURIComponent(version)}`;
}

export interface PlaylistCover {
  readonly cover: string | null;
  readonly onCoverError: () => void;
}

/* The custom, first-track, sleeve chain every surface that draws a playlist
 * cover shares, so their failure states cannot drift. The level and its version
 * come from `ui-foundation`; this hook maps the level to a URL. */
export function usePlaylistCover(
  playlist: Playlist,
  includeCustom = true
): PlaylistCover {
  const [coverFailure, setCoverFailure] = useState(CoverFailure.None);
  const selection = selectPlaylistCover(playlist, coverFailure, {
    includeCustom
  });
  const customPath = customCoverPath(playlist);
  const trackPath = trackCoverPath(playlist);
  const cover =
    selection.level === 'custom' && customPath !== null
      ? withVersion(customPath, selection.version)
      : selection.level === 'track' && trackPath !== null
        ? withVersion(trackPath, selection.version)
        : null;

  /* The image has no source to name, so the failure state names which level
   * failed: the custom image first, then the track thumbnail, then the sleeve. */
  const onCoverError = () =>
    setCoverFailure(nextCoverFailure(selection.level, coverFailure));

  useEffect(() => {
    setCoverFailure(CoverFailure.None);
  }, [coverChainKey(playlist), includeCustom]);

  return { cover, onCoverError };
}
