import { describe, expect, it } from 'vitest';

import { mediaRelativePath, thumbnailRelativePath } from './mediaPaths.js';

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
