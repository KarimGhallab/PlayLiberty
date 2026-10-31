import { endpoints } from '@playliberty/contracts';

import { mediaSource } from '../../../shared/media/mediaSource';

import type { ApiConfig } from '../../../auth/useApiConfig';
import type { PlayerTrack } from '../../playerTrack/playerTrack';

/** The one state the Android media service and its notification draw. */
export interface BackgroundPlaybackState {
  readonly title: string;
  readonly playlistName: string;
  readonly artworkUrl: string;
  readonly artworkHeaders: Record<string, string>;
  readonly isPlaying: boolean;
  readonly playLabel: string;
  readonly pauseLabel: string;
  readonly channelName: string;
}

export interface BackgroundPlaybackLabels {
  readonly play: string;
  readonly pause: string;
  readonly channel: string;
}

export interface BackgroundTrackInput {
  readonly track: PlayerTrack;
  readonly playlistId: string | null;
  readonly playlistName: string | null;
  readonly coverUpdatedAt: string | null;
  readonly coverTrackId: string | null;
  readonly isPlaying: boolean;
  readonly config: ApiConfig | null;
  readonly labels: BackgroundPlaybackLabels;
}

function artworkFor(input: BackgroundTrackInput): {
  readonly url: string;
  readonly headers: Record<string, string>;
} {
  const { config, track, playlistId, coverUpdatedAt, coverTrackId } = input;

  if (config === null) {
    return { url: '', headers: {} };
  }

  if (playlistId !== null && coverUpdatedAt !== null) {
    const source = mediaSource(config, endpoints.playlistCover, {
      playlistId
    });

    return {
      url: `${source.uri}?v=${encodeURIComponent(coverUpdatedAt)}`,
      headers: source.headers
    };
  }

  if (coverTrackId !== null) {
    const source = mediaSource(config, endpoints.trackThumbnail, {
      trackId: coverTrackId
    });

    return { url: source.uri, headers: source.headers };
  }

  if (track.thumbnailPath !== null) {
    const source = mediaSource(config, endpoints.trackThumbnail, {
      trackId: track.id
    });

    return { url: source.uri, headers: source.headers };
  }

  return { url: '', headers: {} };
}

/* The service receives one plain state object, so the notification and the lock
 * screen cannot disagree with the bar about what is playing. */
export function backgroundPlaybackState(
  input: BackgroundTrackInput
): BackgroundPlaybackState {
  const artwork = artworkFor(input);

  return {
    title: input.track.title,
    playlistName: input.playlistName ?? '',
    artworkUrl: artwork.url,
    artworkHeaders: artwork.headers,
    isPlaying: input.isPlaying,
    playLabel: input.labels.play,
    pauseLabel: input.labels.pause,
    channelName: input.labels.channel
  };
}
