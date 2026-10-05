import { describe, expect, it } from 'vitest';

import { YoutubeSourceKind } from '../types.js';
import { validateYoutubeUrl } from './validateYoutubeUrl.js';

describe('validateYoutubeUrl', () => {
  it('accepts a playlist URL', () => {
    const info = validateYoutubeUrl(
      'https://www.youtube.com/playlist?list=PL1234567890abcdef'
    );

    expect(info.kind).toBe(YoutubeSourceKind.Playlist);
    expect(info.sourceId).toBe('PL1234567890abcdef');
    expect(info.url).toBe(
      'https://www.youtube.com/playlist?list=PL1234567890abcdef'
    );
  });

  it('accepts a watch URL and prefers the playlist when a list is present', () => {
    const info = validateYoutubeUrl(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890abcdef'
    );

    expect(info.kind).toBe(YoutubeSourceKind.Playlist);
    expect(info.sourceId).toBe('PL1234567890abcdef');
  });

  it('accepts a plain watch URL as a video', () => {
    const info = validateYoutubeUrl(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );

    expect(info.kind).toBe(YoutubeSourceKind.Video);
    expect(info.sourceId).toBe('dQw4w9WgXcQ');
    expect(info.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('accepts a youtu.be short URL', () => {
    const info = validateYoutubeUrl('https://youtu.be/dQw4w9WgXcQ');

    expect(info.kind).toBe(YoutubeSourceKind.Video);
    expect(info.sourceId).toBe('dQw4w9WgXcQ');
  });

  it('rejects a non-https URL', () => {
    expect(() =>
      validateYoutubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')
    ).toThrow();
  });

  it('rejects a non-YouTube host', () => {
    expect(() =>
      validateYoutubeUrl('https://example.com/watch?v=dQw4w9WgXcQ')
    ).toThrow();
  });

  it('rejects credentials in the URL', () => {
    expect(() =>
      validateYoutubeUrl(
        'https://user:pass@www.youtube.com/watch?v=dQw4w9WgXcQ'
      )
    ).toThrow();
  });

  it('rejects a URL without a video or playlist id', () => {
    expect(() =>
      validateYoutubeUrl('https://www.youtube.com/feed/subscriptions')
    ).toThrow();
  });
});
