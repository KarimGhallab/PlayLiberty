import { describe, expect, it } from '@jest/globals';

import { nextTracksPageParam } from './usePlaylistTracks';

describe('the next tracks page', () => {
  it('starts where the loaded page ends', () => {
    expect(
      nextTracksPageParam({
        offset: 0,
        total: 250,
        items: Array.from({ length: 100 })
      })
    ).toBe(100);
  });

  it('follows a partial page from its own offset', () => {
    expect(
      nextTracksPageParam({
        offset: 100,
        total: 250,
        items: Array.from({ length: 50 })
      })
    ).toBe(150);
  });

  it('stops at the total', () => {
    expect(
      nextTracksPageParam({
        offset: 200,
        total: 250,
        items: Array.from({ length: 50 })
      })
    ).toBeUndefined();
  });

  it('stops on an empty page', () => {
    expect(
      nextTracksPageParam({ offset: 0, total: 0, items: [] })
    ).toBeUndefined();
  });
});
