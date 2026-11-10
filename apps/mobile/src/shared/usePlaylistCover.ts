import { useEffect, useState } from 'react';

import type { Playlist } from '@playliberty/contracts';
import { endpoints } from '@playliberty/contracts';
import {
  CoverFailure,
  coverChainKey,
  nextCoverFailure,
  selectPlaylistCover
} from '@playliberty/ui-foundation';

import {
  type CredentialedAddress,
  mediaAddress
} from '../api/credentialed/credentialed';
import type { ApiConfig } from '../auth/useApiConfig/useApiConfig';
import { sleeveColor } from './styles/sleeve';

export interface PlaylistCover {
  readonly source: CredentialedAddress | null;
  readonly sleeve: string;
  readonly onError: () => void;
}

function withVersion(
  source: CredentialedAddress,
  version: string | null
): CredentialedAddress {
  return version === null
    ? source
    : { ...source, uri: `${source.uri}?v=${encodeURIComponent(version)}` };
}

/* The custom, first-track, sleeve chain every cover surface shares, chosen from
 * `ui-foundation`'s level; the image element reads it with the session's token headers. */
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
      : mediaAddress(config, endpoints.playlistCover, {
          playlistId: playlist.id
        });
  const trackSource =
    playlist.coverTrackId === null
      ? null
      : mediaAddress(config, endpoints.trackThumbnail, {
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
