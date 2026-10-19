import { describe, expect, it } from 'vitest';

import { endpointPath, endpointPattern } from '@playliberty/contracts';

describe('endpointPath', () => {
  it('fills the declared parameters and encodes each value', () => {
    expect(
      endpointPath('/playlists/:playlistId/tracks/:trackId', {
        playlistId: 'playlist 1',
        trackId: 'track-1'
      })
    ).toBe('/playlists/playlist%201/tracks/track-1');
  });

  it('refuses a call that leaves a parameter out', () => {
    expect(() => endpointPath('/playlists/:playlistId', {})).toThrow(
      'playlistId'
    );
  });
});

describe('endpointPattern', () => {
  it('leaves an omitted parameter as the pattern to match', () => {
    expect(
      endpointPattern('/playlists/:playlistId/tracks/:trackId', {
        playlistId: 'playlist-1'
      })
    ).toBe('/playlists/playlist-1/tracks/:trackId');
  });
});
