import { useEffect, useState } from 'react';

import type { Playlist } from '@playliberty/contracts';
import { endpointPath, endpoints } from '@playliberty/contracts';

import {
  ACCESS_TOKEN_HEADER,
  ACCESS_TOKEN_ID_HEADER,
  API_PREFIX
} from '../../api/apiClient/ApiClient';
import type { ApiConfig } from '../../auth/useApiConfig';
import { sleeveColor } from '../styles/sleeve';

enum CoverFailure {
  None = 'none',
  Custom = 'custom',
  Track = 'track'
}

export interface PlaylistCoverSource {
  readonly uri: string;
  readonly headers: Record<string, string>;
}

export interface PlaylistCover {
  readonly source: PlaylistCoverSource | null;
  readonly sleeve: string;
  readonly onError: () => void;
}

function mediaUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${API_PREFIX}${path}`;
}

/* The custom, first-track, sleeve chain every surface that draws a playlist
 * cover shares. A media route is read by an image element, so it carries the
 * session's token headers rather than the API client. */
export function usePlaylistCover(
  playlist: Playlist,
  config: ApiConfig | null
): PlaylistCover {
  const [failure, setFailure] = useState(CoverFailure.None);

  useEffect(() => {
    setFailure(CoverFailure.None);
  }, [playlist.coverUpdatedAt, playlist.coverTrackId]);

  const sleeve = sleeveColor(playlist.id);

  if (config === null) {
    return { source: null, sleeve, onError: () => {} };
  }

  const headers: Record<string, string> = {
    [ACCESS_TOKEN_ID_HEADER]: config.token.id,
    [ACCESS_TOKEN_HEADER]: config.token.secret
  };

  const customSource =
    playlist.coverUpdatedAt === null
      ? null
      : {
          uri: `${mediaUrl(
            config.baseUrl,
            endpointPath(endpoints.playlistCover.path, {
              playlistId: playlist.id
            })
          )}?v=${encodeURIComponent(playlist.coverUpdatedAt)}`,
          headers
        };

  const trackSource =
    playlist.coverTrackId === null
      ? null
      : {
          uri: mediaUrl(
            config.baseUrl,
            endpointPath(endpoints.trackThumbnail.path, {
              trackId: playlist.coverTrackId
            })
          ),
          headers
        };

  const showingCustom = customSource !== null && failure === CoverFailure.None;
  const source = showingCustom
    ? customSource
    : failure === CoverFailure.Track
      ? null
      : trackSource;

  const onError = (): void => {
    setFailure(showingCustom ? CoverFailure.Custom : CoverFailure.Track);
  };

  return { source, sleeve, onError };
}
