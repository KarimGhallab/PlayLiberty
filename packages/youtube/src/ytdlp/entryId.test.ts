import { describe, expect, it } from 'vitest';

import { toEntry } from './ytdlp.js';

describe('toEntry', () => {
  it('accepts a video id', () => {
    const entry = toEntry({ id: 'dQw4w9WgXcQ', title: 'A song' });

    expect(entry.videoId).toBe('dQw4w9WgXcQ');
    expect(entry.title).toBe('A song');
  });

  it('refuses an id that is not a video id before it can become a path', () => {
    for (const id of [
      '',
      '..',
      '../../../../tmp/evil',
      'a/b',
      'short',
      'a b'
    ]) {
      expect(() => toEntry({ id })).toThrow(/valid video id/);
    }
  });
});
