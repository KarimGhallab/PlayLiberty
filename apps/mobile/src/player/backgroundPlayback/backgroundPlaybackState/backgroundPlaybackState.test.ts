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
    coverUpdatedAt: null,
    coverTrackId: null,
    isPlaying: true,
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
    expect(result.artworkUrl).toBe(
      'https://instance.test/api/v1/tracks/track-1/thumbnail'
    );
    expect(result.artworkHeaders).toEqual({
      'P-Access-Token-Id': 'token-id',
      'P-Access-Token': 'token-secret'
    });
    expect(result.playLabel).toBe('Play');
    expect(result.pauseLabel).toBe('Pause');
  });

  it('prefers the custom cover, then the cover track', () => {
    const custom = state({ coverUpdatedAt: '2026-10-01T00:00:00.000Z' });

    expect(custom.artworkUrl).toBe(
      'https://instance.test/api/v1/playlists/playlist-1/cover?v=2026-10-01T00%3A00%3A00.000Z'
    );

    const coverTrack = state({ coverTrackId: 'track-9' });

    expect(coverTrack.artworkUrl).toBe(
      'https://instance.test/api/v1/tracks/track-9/thumbnail'
    );
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
