import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  utimes,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { DownloadOptions } from '../types.js';
import { YtdlpFetcher } from './ytdlp.js';

const VIDEO_ID = 'dQw4w9WgXcQ';

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

let directory: string | undefined;

afterEach(async () => {
  if (directory !== undefined) {
    await rm(directory, { recursive: true, force: true });
    directory = undefined;
  }
});

async function workspace(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ytdlp-fetch-'));
  directory = root;
  return root;
}

/* Stands in for the tool: reads the `-o` template and writes the file the
 * template names, with the extension the test wants. */
async function fakeBinary(root: string, extension: string): Promise<string> {
  const path = join(root, 'fake-yt-dlp.sh');

  await writeFile(
    path,
    `#!/bin/sh
out=""
prev=""
for arg in "$@"; do
  if [ "$prev" = "-o" ]; then out="$arg"; fi
  prev="$arg"
done
printf 'fake-audio' > "$(printf '%s' "$out" | sed 's/%(ext)s/${extension}/')"
`
  );
  await chmod(path, 0o755);

  return path;
}

function fetcher(binary: string): YtdlpFetcher {
  return new YtdlpFetcher({ binary, timeoutMs: 5000, download });
}

describe('YtdlpFetcher.fetchTrack', () => {
  it('reports the file the tool wrote, whatever its extension', async () => {
    const root = await workspace();
    const tempDir = join(root, 'tmp');
    const binary = await fakeBinary(root, 'webm');

    const result = await fetcher(binary).fetchTrack({
      videoId: VIDEO_ID,
      tempDir,
      skipNonMusic: false
    });

    expect(result.filePath).toBe(join(tempDir, `${VIDEO_ID}.webm`));
    expect(await readFile(result.filePath, 'utf8')).toBe('fake-audio');
  });

  it('prefers the newest file when an earlier attempt left one behind', async () => {
    const root = await workspace();
    const tempDir = join(root, 'tmp');
    await mkdir(tempDir, { recursive: true });
    const stale = join(tempDir, `${VIDEO_ID}.m4a`);
    await writeFile(stale, 'stale');
    await utimes(stale, new Date(0), new Date(0));
    const binary = await fakeBinary(root, 'webm');

    const result = await fetcher(binary).fetchTrack({
      videoId: VIDEO_ID,
      tempDir,
      skipNonMusic: false
    });

    expect(result.filePath).toBe(join(tempDir, `${VIDEO_ID}.webm`));
  });

  it('fails when the tool left only a partial file', async () => {
    const root = await workspace();
    const tempDir = join(root, 'tmp');
    const binary = await fakeBinary(root, 'webm.part');

    await expect(
      fetcher(binary).fetchTrack({
        videoId: VIDEO_ID,
        tempDir,
        skipNonMusic: false
      })
    ).rejects.toThrow(/wrote no file/);
  });
});
