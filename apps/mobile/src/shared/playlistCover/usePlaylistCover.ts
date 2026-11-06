import { useEffect, useState } from 'react';

import type { Playlist } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';

import type { ApiConfig } from '../../auth/useApiConfig';
import { type MediaSource, mediaSource } from '../media/mediaSource';
import { sleeveColor } from '../styles/sleeve';

enum CoverFailure {
  None = 'none',
  Custom = 'custom',
  Track = 'track'
}

export interface PlaylistCover {
  readonly source: MediaSource | null;
  readonly sleeve: string;
  readonly onError: () => void;
}

function withVersion(source: MediaSource, version: string): MediaSource {
  return { ...source, uri: `${source.uri}?v=${encodeURIComponent(version)}` };
}

/* The custom, first-track, sleeve chain every surface that draws a playlist
 * cover shares. A media route is read by an image element, so it carries the
 * session's token headers rather than the API client. */
export function usePlaylistCover(
  playlist: Playlist | null,
  config: ApiConfig | null
): PlaylistCover {
  const [failure, setFailure] = useState(CoverFailure.None);

  useEffect(() => {
    setFailure(CoverFailure.None);
  }, [playlist?.coverUpdatedAt, playlist?.coverTrackId]);

  const sleeve = sleeveColor(playlist?.id ?? '');

  if (config === null || playlist === null) {
    return { source: null, sleeve, onError: () => {} };
  }

  const customSource =
    playlist.coverUpdatedAt === null
      ? null
      : withVersion(
          mediaSource(config, endpoints.playlistCover, {
            playlistId: playlist.id
          }),
          playlist.coverUpdatedAt
        );

  const trackSource =
    playlist.coverTrackId === null
      ? null
      : withVersion(
          mediaSource(config, endpoints.trackThumbnail, {
            trackId: playlist.coverTrackId
          }),
          playlist.coverTrackId
        );

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
