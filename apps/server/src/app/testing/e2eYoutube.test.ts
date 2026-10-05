import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  YoutubeSourceKind,
  YoutubeVideoUnavailableError
} from '@playliberty/youtube';

import { createE2eYoutube } from './e2eYoutube.js';

/*
 * The E2E fake is not product code, but it is the seam every E2E test trusts, and
 * its three outcomes (a song, a fault, a video that is gone) are the three shapes
 * the adapter has to answer. A test here protects them without a browser and
 * without the E2E stack, which is the only way to cover the fake while Playwright
 * is not part of the suite.
 */

let directory: string;
let scriptPath: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'playliberty-e2e-fake-'));
  scriptPath = join(directory, 'scenario.json');
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

async function writeScenario(scenario: unknown): Promise<void> {
  await writeFile(scriptPath, JSON.stringify(scenario), 'utf8');
}

const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=E2Eplaylist1';

describe('the E2E fake adapter', () => {
  it('answers a playlist URL from the scenario it names', async () => {
    await writeScenario({
      sources: {
        E2Eplaylist1: {
          title: 'Evening Jazz',
          entries: [
            { videoId: 'e2evideo001', title: 'Blue In Green' },
            { videoId: 'e2evideo002', title: 'Naima' }
          ]
        }
      }
    });

    const source = await createE2eYoutube(scriptPath).listSource(PLAYLIST_URL);

    expect(source.kind).toBe(YoutubeSourceKind.Playlist);
    expect(source.sourceId).toBe('E2Eplaylist1');
    expect(source.title).toBe('Evening Jazz');
    expect(source.entries.map(entry => entry.videoId)).toEqual([
      'e2evideo001',
      'e2evideo002'
    ]);
  });

  it('fails when the scenario has no source for the URL', async () => {
    await writeScenario({ sources: {} });

    await expect(
      createE2eYoutube(scriptPath).listSource(PLAYLIST_URL)
    ).rejects.toThrow(/no source/);
  });

  it('writes real audio bytes for a download', async () => {
    await writeScenario({ sources: {} });
    const outputPath = join(directory, 'out', 'track.m4a');

    const result = await createE2eYoutube(scriptPath).downloadTrack({
      videoId: 'v',
      outputPath,
      tempDir: directory,
      skipNonMusic: true
    });

    expect(result.filePath).toBe(outputPath);
    const bytes = await readFile(outputPath);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it('throws a transient error when the scenario says a download fails', async () => {
    await writeScenario({ sources: {}, downloads: { v: 'fail' } });

    await expect(
      createE2eYoutube(scriptPath).downloadTrack({
        videoId: 'v',
        outputPath: join(directory, 'out.m4a'),
        tempDir: directory,
        skipNonMusic: true
      })
    ).rejects.toThrow(/fail this download/);
  });

  it('throws the terminal error when the scenario says a video is gone', async () => {
    await writeScenario({ sources: {}, downloads: { v: 'gone' } });

    await expect(
      createE2eYoutube(scriptPath).downloadTrack({
        videoId: 'v',
        outputPath: join(directory, 'out.m4a'),
        tempDir: directory,
        skipNonMusic: true
      })
    ).rejects.toBeInstanceOf(YoutubeVideoUnavailableError);
  });

  it('creates the destination directory a thumbnail needs', async () => {
    await writeScenario({ sources: {} });
    const outputPath = join(directory, 'thumbnails', 'ab', 'v.jpg');

    await createE2eYoutube(scriptPath).fetchThumbnail(
      'https://i.ytimg.com/vi/v/hq.jpg',
      outputPath
    );

    const bytes = await readFile(outputPath);
    expect(bytes.byteLength).toBeGreaterThan(0);
  });
});
