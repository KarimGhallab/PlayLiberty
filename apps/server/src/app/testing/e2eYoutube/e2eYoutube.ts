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
 * The E2E adapter, the only seam an E2E test fakes: YouTube is external and
 * non-deterministic, so a browser cannot sync against it. A test loads it
 * only under `NODE_ENV=test`, and downloads copy committed media.
 */

interface ScenarioEntry {
  videoId: string;
  title: string;
  /* The fixture's real length: a number that disagrees makes a real seek
   * unmeasurable, since the element clamps `currentTime` to the file. */
  durationSeconds?: number;
}

interface ScenarioSource {
  title?: string;
  entries: ScenarioEntry[];
}

interface Scenario {
  sources: Record<string, ScenarioSource>;
  /* A download's outcome per video id; missing means `ok`, `gone` terminal,
   * `fail` transient. */
  downloads?: Record<string, 'ok' | 'fail' | 'gone'>;
  /* A per-download delay; zero or missing is immediate. A test watching a row
   * move to playable sets it so the intermediate state stays observable. */
  downloadDelayMs?: number;
  /* The audio every successful download copies. The short one is the default;
     the long one outlasts a journey that seeks and advances the queue. */
  audioFixture?: 'short' | 'long';
}

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const THUMBNAIL_FIXTURE = join(FIXTURES_DIR, 'test-thumbnail.jpg');

/* A fixture's length, pinned rather than probed: the files are committed, so
 * re-reading them would only move the cost. */
const AUDIO_FIXTURES = {
  short: { file: join(FIXTURES_DIR, 'test-audio.m4a'), seconds: 2 },
  long: { file: join(FIXTURES_DIR, 'test-audio-long.m4a'), seconds: 60 }
} as const;

function audioOf(scenario: Scenario) {
  return AUDIO_FIXTURES[scenario.audioFixture ?? 'short'];
}

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

function entryOf(entry: ScenarioEntry, seconds: number): YoutubeSourceEntry {
  return {
    videoId: entry.videoId,
    title: entry.title,
    durationSeconds: entry.durationSeconds ?? seconds,
    thumbnailUrl: `https://i.ytimg.com/vi/${entry.videoId}/hq.jpg`
  };
}

/* The source a URL names. `validateYoutubeUrl` is the product's validator, so a
 * fake cannot take a URL the real path refuses, keyed by the extracted id. */
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
    entries: scripted.entries.map(entry =>
      entryOf(entry, audioOf(scenario).seconds)
    )
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

      const delay = scenario.downloadDelayMs;

      if (delay !== undefined && delay > 0) {
        await new Promise<void>(resolve => {
          setTimeout(resolve, delay);
        });
      }

      await mkdir(dirname(request.outputPath), { recursive: true });
      await copyFile(audioOf(scenario).file, request.outputPath);

      return {
        videoId: request.videoId,
        filePath: request.outputPath,
        durationSeconds: audioOf(scenario).seconds
      };
    },

    fetchThumbnail: async (_url: string, outputPath: string): Promise<void> => {
      await mkdir(dirname(outputPath), { recursive: true });
      await copyFile(THUMBNAIL_FIXTURE, outputPath);
    }
  };
}
