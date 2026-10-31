import { describe, expect, it } from '@jest/globals';

import type { ApiConfig } from '../../../auth/useApiConfig';
import type { PlayerTrack } from '../../playerTrack/playerTrack';
import {
  type BackgroundPlaybackLabels,
  backgroundPlaybackState
} from './backgroundPlaybackState';

const config: ApiConfig = {
  baseUrl: 'https://instance.test',
  token: { id: 'token-id', secret: 'token-secret' }
};

const labels: BackgroundPlaybackLabels = {
  play: 'Play',
  pause: 'Pause',
  previous: 'Previous track',
  next: 'Next track',
  channel: 'Player'
};

const track: PlayerTrack = {
  id: 'track-1',
  title: 'First Song',
  durationSeconds: 182,
  thumbnailPath: 'thumbs/1.jpg'
};

function state(
  overrides: Partial<Parameters<typeof backgroundPlaybackState>[0]> = {}
) {
  return backgroundPlaybackState({
    track,
    playlistId: 'playlist-1',
    playlistName: 'Rain On The Window',
    route: '/playlists/playlist-1',
    coverUpdatedAt: null,
    coverTrackId: null,
    isPlaying: true,
    positionSeconds: 30,
    canPrevious: true,
    canNext: true,
    config,
    labels,
    ...overrides
  });
}

describe('the background playback state', () => {
  it('names the track and playlist and uses the track thumbnail', () => {
    const result = state();

    expect(result.title).toBe('First Song');
    expect(result.playlistName).toBe('Rain On The Window');
    expect(result.route).toBe('/playlists/playlist-1');
    expect(result.artworkUrl).toBe(
      'https://instance.test/api/v1/tracks/track-1/thumbnail'
    );
    expect(result.artworkHeaders).toEqual({
      'P-Access-Token-Id': 'token-id',
      'P-Access-Token': 'token-secret'
    });
    expect(result.playLabel).toBe('Play');
    expect(result.pauseLabel).toBe('Pause');
    expect(result.previousLabel).toBe('Previous track');
    expect(result.nextLabel).toBe('Next track');
    expect(result.positionSeconds).toBe(30);
    expect(result.durationSeconds).toBe(182);
    expect(result.canPrevious).toBe(true);
    expect(result.canNext).toBe(true);
  });

  it('uses the track thumbnail, then falls back to the playlist cover', () => {
    const noThumbnail = state({
      track: { ...track, thumbnailPath: null },
      coverUpdatedAt: '2026-10-01T00:00:00.000Z'
    });

    expect(noThumbnail.artworkUrl).toBe(
      'https://instance.test/api/v1/playlists/playlist-1/cover?v=2026-10-01T00%3A00%3A00.000Z'
    );

    const coverTrack = state({
      track: { ...track, thumbnailPath: null },
      coverTrackId: 'track-9'
    });

    expect(coverTrack.artworkUrl).toBe(
      'https://instance.test/api/v1/tracks/track-9/thumbnail'
    );
  });

  it('carries the app language into every control label', () => {
    const french = state({
      labels: {
        play: 'Lire',
        pause: 'Mettre en pause',
        previous: 'Piste précédente',
        next: 'Piste suivante',
        channel: 'Lecteur'
      }
    });

    expect(french.playLabel).toBe('Lire');
    expect(french.pauseLabel).toBe('Mettre en pause');
    expect(french.previousLabel).toBe('Piste précédente');
    expect(french.nextLabel).toBe('Piste suivante');
    expect(french.channelName).toBe('Lecteur');
  });

  it('leaves a bare track without a playlist', () => {
    const result = state({ playlistId: null, playlistName: null });

    expect(result.playlistName).toBe('');
    expect(result.artworkUrl).toBe(
      'https://instance.test/api/v1/tracks/track-1/thumbnail'
    );
  });

  it('leaves the artwork empty without a config', () => {
    const result = state({ config: null });

    expect(result.artworkUrl).toBe('');
    expect(result.artworkHeaders).toEqual({});
  });
});
