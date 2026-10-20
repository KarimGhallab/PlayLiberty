import { describe, expect, it } from 'vitest';

import {
  coverRelativePath,
  mediaRelativePath,
  thumbnailRelativePath
} from './mediaPaths.js';

describe('mediaRelativePath', () => {
  it('shards a video id under the media directory', () => {
    expect(mediaRelativePath('dQw4w9WgXcQ', '.m4a')).toBe(
      'media/dQ/dQw4w9WgXcQ.m4a'
    );
  });

  it('refuses an id that would resolve outside the media store', () => {
    expect(() => mediaRelativePath('../../../../tmp/evil', '.m4a')).toThrow(
      /outside the media store/
    );
  });
});

describe('thumbnailRelativePath', () => {
  it('shards a video id under the thumbnails directory', () => {
    expect(thumbnailRelativePath('dQw4w9WgXcQ')).toBe(
      'thumbnails/dQ/dQw4w9WgXcQ.jpg'
    );
  });

  it('refuses an id that would resolve outside the media store', () => {
    expect(() => thumbnailRelativePath('../../../../tmp/evil')).toThrow(
      /outside the media store/
    );
  });
});

describe('coverRelativePath', () => {
  it('names a cover by its playlist and token under the covers directory', () => {
    expect(coverRelativePath('playlist-1', 'token-1')).toBe(
      'covers/playlist-1-token-1.webp'
    );
  });

  it('refuses an id that would resolve outside the media store', () => {
    expect(() => coverRelativePath('../../../../tmp/evil', 'token-1')).toThrow(
      /outside the media store/
    );
  });
});
