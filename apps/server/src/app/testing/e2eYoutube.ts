import { readFileSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  DownloadTrackRequest,
  DownloadTrackResult,
  IYoutubeClient,
  YoutubeSource,
  YoutubeSourceEntry
} from '@playliberty/youtube';
import {
  YoutubeVideoUnavailableError,
  validateYoutubeUrl
} from '@playliberty/youtube';

/*
 * The adapter an end-to-end run drives, and the only seam an E2E test fakes.
 * YouTube is external, non-deterministic and network dependent, so a browser
 * cannot sync against it; this answers instead, from a scenario file the test
 * writes and this reads on every call.
 *
 * It is loaded by `main.ts` only when `NODE_ENV` is `test`, through a dynamic
 * import, so a production process never carries the code and never reads the
 * file. The scenario path arrives in `E2E_FAKE_SCRIPT`.
 *
 * The downloads are real: `downloadTrack` copies a committed silent M4A to the
 * path the worker asked for, so the stream route serves real bytes and a future
 * playback test can actually play. `fetchThumbnail` copies a committed JPEG.
 * The scenarios decide whether a video is present, absent, or fails, and those
 * are the shapes the product has to answer: a song, a removed video, a fault.
 */

interface ScenarioEntry {
  videoId: string;
  title: string;
}

interface ScenarioSource {
  title?: string;
  entries: ScenarioEntry[];
}

interface Scenario {
  sources: Record<string, ScenarioSource>;
  /*
   * The outcome of a download, per video id. Missing means `ok`. `gone` is the
   * terminal case, `fail` the transient one.
   */
  downloads?: Record<string, 'ok' | 'fail' | 'gone'>;
}

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const AUDIO_FIXTURE = join(FIXTURES_DIR, 'test-audio.m4a');
const THUMBNAIL_FIXTURE = join(FIXTURES_DIR, 'test-thumbnail.jpg');

function readScenario(scriptPath: string): Scenario {
  const raw = readFileSync(scriptPath, 'utf8');
  const parsed: unknown = JSON.parse(raw);

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('sources' in parsed) ||
    typeof (parsed as Scenario).sources !== 'object'
  ) {
    throw new Error('The E2E fake script is missing a `sources` object.');
  }

  return parsed as Scenario;
}

function entryOf(entry: ScenarioEntry): YoutubeSourceEntry {
  return {
    videoId: entry.videoId,
    title: entry.title,
    durationSeconds: 180,
    thumbnailUrl: `https://i.ytimg.com/vi/${entry.videoId}/hq.jpg`
  };
}

/*
 * The source a URL names. `validateYoutubeUrl` is the same validator the product
 * uses, so the fake cannot accept a URL the real path would refuse; the scenario
 * is keyed by the playlist or video id the validator extracts, which is how a
 * test chooses what a given URL returns without any extra control surface.
 */
function sourceFor(scenario: Scenario, url: string): YoutubeSource {
  const info = validateYoutubeUrl(url);
  const scripted = scenario.sources[info.sourceId];

  if (scripted === undefined) {
    throw new Error(
      `The E2E fake script has no source for "${info.sourceId}".`
    );
  }

  return {
    kind: info.kind,
    sourceId: info.sourceId,
    title: scripted.title ?? 'E2E Playlist',
    entries: scripted.entries.map(entryOf)
  };
}

export function createE2eYoutube(scriptPath: string): IYoutubeClient {
  return {
    listSource: async (url: string): Promise<YoutubeSource> =>
      sourceFor(readScenario(scriptPath), url),

    downloadTrack: async (
      request: DownloadTrackRequest
    ): Promise<DownloadTrackResult> => {
      const scenario = readScenario(scriptPath);
      const outcome = scenario.downloads?.[request.videoId] ?? 'ok';

      if (outcome === 'gone') {
        throw new YoutubeVideoUnavailableError('This video is not available.');
      }

      if (outcome === 'fail') {
        throw new Error('The E2E fake was told to fail this download.');
      }

      await mkdir(dirname(request.outputPath), { recursive: true });
      await copyFile(AUDIO_FIXTURE, request.outputPath);

      return { videoId: request.videoId, filePath: request.outputPath };
    },

    fetchThumbnail: async (_url: string, outputPath: string): Promise<void> => {
      await mkdir(dirname(outputPath), { recursive: true });
      await copyFile(THUMBNAIL_FIXTURE, outputPath);
    }
  };
}
