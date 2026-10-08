import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DownloadOptions } from '../types.js';
import { YtdlpClient } from './ytdlp.js';

const download: DownloadOptions = {
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

function client(
  options: { timeoutMs?: number; maxBytes?: number } = {}
): YtdlpClient {
  return new YtdlpClient({
    binary: 'yt-dlp',
    ffmpegBinary: 'ffmpeg',
    ffprobeBinary: 'ffprobe',
    timeoutMs: 1000,
    download,
    thumbnailTimeoutMs: options.timeoutMs ?? 1000,
    thumbnailMaxBytes: options.maxBytes ?? 1024 * 1024
  });
}

let directory: string | undefined;

async function outputPath(): Promise<string> {
  directory = await mkdtemp(join(tmpdir(), 'ytdlp-thumb-'));
  return join(directory, 'thumbnail.jpg');
}

afterEach(async () => {
  vi.unstubAllGlobals();

  if (directory !== undefined) {
    await rm(directory, { recursive: true, force: true });
    directory = undefined;
  }
});

describe('YtdlpClient.fetchThumbnail', () => {
  it('stores a thumbnail from an allowed image host', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: { 'content-type': 'image/jpeg' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const output = await outputPath();

    await client().fetchThumbnail(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hq.jpg',
      output
    );

    expect(await readFile(output)).toEqual(Buffer.from(bytes));
  });

  it('refuses a host that is not an allowed image host, without fetching it', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const output = await outputPath();

    await expect(
      client().fetchThumbnail('https://evil.example.com/thumb.jpg', output)
    ).rejects.toThrow(/allowed YouTube image host/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a thumbnail URL that is not https', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const output = await outputPath();

    await expect(
      client().fetchThumbnail('http://i.ytimg.com/vi/x/hq.jpg', output)
    ).rejects.toThrow(/https/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a redirect that leaves the image hosts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'https://evil.example.com/steal' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const output = await outputPath();

    await expect(
      client().fetchThumbnail('https://i.ytimg.com/vi/x/hq.jpg', output)
    ).rejects.toThrow(/allowed YouTube image host/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('follows a redirect that stays on an allowed host', async () => {
    const bytes = new Uint8Array([9, 9]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: 'https://i9.ytimg.com/vi/x/hq.jpg' }
        })
      )
      .mockResolvedValueOnce(new Response(bytes, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const output = await outputPath();

    await client().fetchThumbnail('https://i.ytimg.com/vi/x/hq.jpg', output);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await readFile(output)).toEqual(Buffer.from(bytes));
  });

  it('refuses a body larger than the cap', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(new Uint8Array(2048), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const output = await outputPath();

    await expect(
      client({ maxBytes: 1024 }).fetchThumbnail(
        'https://i.ytimg.com/vi/x/hq.jpg',
        output
      )
    ).rejects.toThrow(/larger than/);
  });

  it('gives up on a slow response', async () => {
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(init.signal?.reason ?? new Error('aborted'));
          });
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const output = await outputPath();

    await expect(
      client({ timeoutMs: 20 }).fetchThumbnail(
        'https://i.ytimg.com/vi/x/hq.jpg',
        output
      )
    ).rejects.toThrow();
  });
});
