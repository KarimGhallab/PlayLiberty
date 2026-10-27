import { describe, expect, it } from 'vitest';

import type { DownloadOptions, YoutubeUrlInfo } from '../types.js';
import { YoutubeSourceKind } from '../types.js';
import { buildDownloadArgs, buildListArgs } from './ytdlp.js';

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

    /* Exact: yt-dlp matches an extractor name exactly, and a playlist URL is
     * `youtube:tab`. */
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

  it('forces IPv4 so a v6 lookup cannot fail the exit', () => {
    const info: YoutubeUrlInfo = {
      kind: YoutubeSourceKind.Video,
      sourceId: 'dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    };

    expect(buildListArgs(info)).toContain('--force-ipv4');
    expect(
      buildDownloadArgs(info.url, '/tmp/track.%(ext)s', downloadOptions, false)
    ).toContain('--force-ipv4');
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
      downloadOptions,
      false
    );
    const selector = args[args.indexOf('--use-extractors') + 1];

    expect(selector).toBe('youtube,youtube:tab');
  });

  it('selects the m4a audio stream and ends with the URL after the separator', () => {
    const args = buildDownloadArgs(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '/media/.tmp/dQw4w9WgXcQ.%(ext)s',
      downloadOptions,
      false
    );

    expect(args).toContain('-f');
    expect(args).toContain('bestaudio[ext=m4a]/bestaudio');
    expect(args).toContain('--limit-rate');
    expect(args.at(-2)).toBe('--');
    expect(args.at(-1)).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('asks SponsorBlock to cut the three categories when the track skips them', () => {
    const args = buildDownloadArgs(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '/media/.tmp/dQw4w9WgXcQ.%(ext)s',
      downloadOptions,
      true
    );

    expect(args).toContain('--sponsorblock-remove');
    expect(args[args.indexOf('--sponsorblock-remove') + 1]).toBe(
      'music_offtopic,sponsor,selfpromo'
    );
  });

  it('passes no SponsorBlock flag for a track fetched whole', () => {
    const args = buildDownloadArgs(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '/media/.tmp/dQw4w9WgXcQ.%(ext)s',
      downloadOptions,
      false
    );

    expect(args).not.toContain('--sponsorblock-remove');
  });

  it('never passes the flag that would re-encode the audio', () => {
    for (const skipNonMusic of [true, false]) {
      const args = buildDownloadArgs(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        '/media/.tmp/dQw4w9WgXcQ.%(ext)s',
        downloadOptions,
        skipNonMusic
      );

      // `--force-keyframes-at-cuts` would re-encode the whole file, breaking
      // the no-transcoding rule. The cut is a stream copy.
      expect(args).not.toContain('--force-keyframes-at-cuts');
    }
  });
});
