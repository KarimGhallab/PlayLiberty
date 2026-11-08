import { describe, expect, it } from 'vitest';

import type { Playlist } from '@playliberty/contracts';

import {
  CoverFailure,
  coverChainKey,
  nextCoverFailure,
  selectPlaylistCover
} from './coverChain.js';

function playlist(
  values: Pick<Playlist, 'coverUpdatedAt' | 'coverTrackId'>
): Pick<Playlist, 'coverUpdatedAt' | 'coverTrackId'> {
  return values;
}

const BOTH = playlist({
  coverUpdatedAt: '2026-11-06T00:00:00.000Z',
  coverTrackId: 'track-1'
});

describe('selectPlaylistCover', () => {
  it('takes the custom cover first, with its version', () => {
    expect(selectPlaylistCover(BOTH, CoverFailure.None)).toEqual({
      level: 'custom',
      version: '2026-11-06T00:00:00.000Z'
    });
  });

  it('falls to the track thumbnail when the custom cover failed, with its version', () => {
    expect(selectPlaylistCover(BOTH, CoverFailure.Custom)).toEqual({
      level: 'track',
      version: 'track-1'
    });
  });

  it('ends at the sleeve after the track thumbnail failed', () => {
    expect(selectPlaylistCover(BOTH, CoverFailure.Track)).toEqual({
      level: 'sleeve',
      version: null
    });
  });

  it('skips the custom level when the surface does not draw it', () => {
    expect(
      selectPlaylistCover(BOTH, CoverFailure.None, { includeCustom: false })
    ).toEqual({
      level: 'track',
      version: 'track-1'
    });
  });

  it('falls straight to the sleeve without a cover or a first track', () => {
    expect(
      selectPlaylistCover(
        playlist({ coverUpdatedAt: null, coverTrackId: null }),
        CoverFailure.None
      )
    ).toEqual({ level: 'sleeve', version: null });
  });
});

describe('nextCoverFailure', () => {
  it('records the level that failed', () => {
    expect(nextCoverFailure('custom', CoverFailure.None)).toBe(
      CoverFailure.Custom
    );
    expect(nextCoverFailure('track', CoverFailure.Custom)).toBe(
      CoverFailure.Track
    );
  });

  it('leaves the state alone at the sleeve', () => {
    expect(nextCoverFailure('sleeve', CoverFailure.Track)).toBe(
      CoverFailure.Track
    );
  });
});

describe('coverChainKey', () => {
  it('changes on either a new custom version or a new first track', () => {
    expect(coverChainKey(BOTH)).not.toBe(
      coverChainKey({ ...BOTH, coverUpdatedAt: '2026-11-07T00:00:00.000Z' })
    );
    expect(coverChainKey(BOTH)).not.toBe(
      coverChainKey({ ...BOTH, coverTrackId: 'track-2' })
    );
  });
});
