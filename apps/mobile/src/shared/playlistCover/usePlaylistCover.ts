import { useEffect, useState } from 'react';

import type { Playlist } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import {
  CoverFailure,
  coverChainKey,
  nextCoverFailure,
  selectPlaylistCover
} from '@playliberty/ui-foundation';

import type { ApiConfig } from '../../auth/useApiConfig';
import { type MediaSource, mediaSource } from '../media/mediaSource';
import { sleeveColor } from '../styles/sleeve';

export interface PlaylistCover {
  readonly source: MediaSource | null;
  readonly sleeve: string;
  readonly onError: () => void;
}

function withVersion(source: MediaSource, version: string | null): MediaSource {
  return version === null
    ? source
    : { ...source, uri: `${source.uri}?v=${encodeURIComponent(version)}` };
}

/* The custom, first-track, sleeve chain every surface that draws a playlist
 * cover shares. A media route is read by an image element, so it carries the
 * session's token headers rather than the API client. The level and its version
 * come from `ui-foundation`; this hook maps the level to a media source. */
export function usePlaylistCover(
  playlist: Playlist | null,
  config: ApiConfig | null
): PlaylistCover {
  const [failure, setFailure] = useState(CoverFailure.None);

  useEffect(() => {
    setFailure(CoverFailure.None);
  }, [playlist === null ? '' : coverChainKey(playlist)]);

  const sleeve = sleeveColor(playlist?.id ?? '');

  if (config === null || playlist === null) {
    return { source: null, sleeve, onError: () => {} };
  }

  const customSource =
    playlist.coverUpdatedAt === null
      ? null
      : mediaSource(config, endpoints.playlistCover, {
          playlistId: playlist.id
        });
  const trackSource =
    playlist.coverTrackId === null
      ? null
      : mediaSource(config, endpoints.trackThumbnail, {
          trackId: playlist.coverTrackId
        });
  const selection = selectPlaylistCover(playlist, failure);
  const source =
    selection.level === 'custom' && customSource !== null
      ? withVersion(customSource, selection.version)
      : selection.level === 'track' && trackSource !== null
        ? withVersion(trackSource, selection.version)
        : null;

  const onError = (): void => {
    setFailure(nextCoverFailure(selection.level, failure));
  };

  return { source, sleeve, onError };
}
