import { describe, expect, it } from 'vitest';

import { YoutubeSourceKind } from './types.js';
import type { DownloadOptions, YoutubeUrlInfo } from './types.js';
import {
  buildDownloadArgs,
  buildFaststartArgs,
  buildListArgs
} from './ytdlp.js';

const downloadOptions: DownloadOptions = {
  concurrency: 2,
  sleepRequests: 1,
  sleepIntervalMin: 5,
  sleepIntervalMax: 15,
  limitRate: '5M',
  retries: 10,
  fragmentRetries: 10,
  fileAccessRetries: 3,
  socketTimeout: 30
};

describe('buildListArgs', () => {
  it('pins extraction to every YouTube extractor a URL can land on', () => {
    const info: YoutubeUrlInfo = {
      kind: YoutubeSourceKind.Playlist,
      sourceId: 'PL1234567890abcdef',
      url: 'https://www.youtube.com/playlist?list=PL1234567890abcdef'
    };
    const args = buildListArgs(info);

    /*
     * Exact, not `toContain('youtube')`. yt-dlp matches an extractor name exactly,
     * and a playlist URL is `youtube:tab`; asserting the whole selector is what
     * would have failed when it read `youtube` and every playlist sync broke.
     */
    expect(args).toContain('--use-extractors');
    const selector = args[args.indexOf('--use-extractors') + 1];
    expect(selector).toBe('youtube,youtube:tab');
  });

  it('places safety flags before the URL separator', () => {
    const info: YoutubeUrlInfo = {
      kind: YoutubeSourceKind.Playlist,
      sourceId: 'PL1234567890abcdef',
      url: 'https://www.youtube.com/playlist?list=PL1234567890abcdef'
    };
    const args = buildListArgs(info);

    expect(args).toContain('--ignore-config');
    expect(args).toContain('--js-runtimes');
    expect(args).toContain('--yes-playlist');
    expect(args.at(-2)).toBe('--');
    expect(args.at(-1)).toBe(info.url);
  });

  it('forces no-playlist for a single video', () => {
    const info: YoutubeUrlInfo = {
      kind: YoutubeSourceKind.Video,
      sourceId: 'dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    };

    expect(buildListArgs(info)).toContain('--no-playlist');
  });
});

describe('buildDownloadArgs', () => {
  it('pins extraction to every YouTube extractor a URL can land on', () => {
    const args = buildDownloadArgs(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '/media/.tmp/dQw4w9WgXcQ.%(ext)s',
      downloadOptions
    );
    const selector = args[args.indexOf('--use-extractors') + 1];

    expect(selector).toBe('youtube,youtube:tab');
  });

  it('selects the m4a audio stream and ends with the URL after the separator', () => {
    const args = buildDownloadArgs(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '/media/.tmp/dQw4w9WgXcQ.%(ext)s',
      downloadOptions
    );

    expect(args).toContain('-f');
    expect(args).toContain('bestaudio[ext=m4a]/bestaudio');
    expect(args).toContain('--limit-rate');
    expect(args).toContain('5M');
    expect(args.at(-2)).toBe('--');
    expect(args.at(-1)).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
});

describe('buildFaststartArgs', () => {
  it('stream-copies with the faststart flag', () => {
    const args = buildFaststartArgs(
      '/media/.tmp/track.m4a',
      '/media/ab/track.m4a'
    );

    expect(args).toContain('-c');
    expect(args).toContain('copy');
    expect(args).toContain('-movflags');
    expect(args).toContain('+faststart');
    expect(args.at(-1)).toBe('/media/ab/track.m4a');
  });
});
