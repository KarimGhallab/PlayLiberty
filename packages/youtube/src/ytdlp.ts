import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  YoutubeSponsorBlockError,
  YoutubeVideoUnavailableError,
  isSponsorBlockFailureMessage,
  isVideoUnavailableMessage
} from './errors.js';
import type {
  DownloadOptions,
  DownloadTrackRequest,
  DownloadTrackResult,
  IYoutubeClient,
  YoutubeSource,
  YoutubeSourceEntry,
  YoutubeUrlInfo,
  YtdlpOptions
} from './types.js';
import { YoutubeSourceKind } from './types.js';
import { validateYoutubeUrl } from './validateYoutubeUrl.js';

/*
 * The extractors this instance is willing to run. yt-dlp's `--use-extractors`
 * matches an extractor name exactly, and a YouTube URL does not always land on the
 * extractor called `youtube`: a watch URL is `youtube`, a playlist or channel tab
 * is `youtube:tab`. Pinning it to `youtube` alone made every playlist URL fail with
 * `No suitable extractor found`, which the app then stored as a failed run and drew
 * as a bare `Sync failed`. The wildcard `youtube*` is not the answer either: it
 * matches nothing, because the option compares the leading name and not a glob.
 *
 * Both names are listed, and both are YouTube, which is the point of the flag:
 * a URL can never route extraction to some other site. A third YouTube extractor
 * added by a future yt-dlp would have to be named here, and the argument test below
 * is what makes that a decision rather than an omission.
 */
const YOUTUBE_EXTRACTORS = 'youtube,youtube:tab';

/*
 * The SponsorBlock categories the app cuts. `music_offtopic` is the only one that
 * literally means the music stopped; `sponsor` and `selfpromo` cover the spoken
 * breaks in long uploads. Fixed in code, because this is one behaviour and not a
 * configuration surface.
 */
const SPONSORBLOCK_CATEGORIES = 'music_offtopic,sponsor,selfpromo';

export function buildListArgs(info: YoutubeUrlInfo): string[] {
  return [
    '--ignore-config',
    '--use-extractors',
    YOUTUBE_EXTRACTORS,
    '--js-runtimes',
    'node',
    '--flat-playlist',
    '--no-warnings',
    '--dump-single-json',
    info.kind === YoutubeSourceKind.Playlist
      ? '--yes-playlist'
      : '--no-playlist',
    '--',
    info.url
  ];
}

export function buildDownloadArgs(
  url: string,
  outputTemplate: string,
  options: DownloadOptions,
  skipNonMusic: boolean
): string[] {
  return [
    '--ignore-config',
    '--use-extractors',
    YOUTUBE_EXTRACTORS,
    '--js-runtimes',
    'node',
    '-f',
    'bestaudio[ext=m4a]/bestaudio',
    ...(skipNonMusic ? ['--sponsorblock-remove', SPONSORBLOCK_CATEGORIES] : []),
    '--no-playlist',
    '--newline',
    '--no-progress',
    '--sleep-requests',
    String(options.sleepRequests),
    '--sleep-interval',
    String(options.sleepIntervalMin),
    '--max-sleep-interval',
    String(options.sleepIntervalMax),
    '--limit-rate',
    options.limitRate,
    '--retries',
    String(options.retries),
    '--fragment-retries',
    String(options.fragmentRetries),
    '--file-access-retries',
    String(options.fileAccessRetries),
    '--socket-timeout',
    String(options.socketTimeout),
    '-o',
    outputTemplate,
    '--',
    url
  ];
}

export function buildFaststartArgs(
  inputPath: string,
  outputPath: string
): string[] {
  return [
    '-y',
    '-i',
    inputPath,
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    '-f',
    'mp4',
    outputPath
  ];
}

/*
 * The probe the adapter reads the finished file's own duration with. ffprobe is
 * the companion binary to ffmpeg and the one tool that reports the container's
 * duration as a bare number; parsing ffmpeg's human-readable banner instead would
 * break on a version or a locale.
 */
export function buildProbeArgs(filePath: string): string[] {
  return [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath
  ];
}

interface RunResult {
  stdout: string;
  stderr: string;
}

function killProcessTree(child: ChildProcess): void {
  if (child.pid === undefined) {
    return;
  }
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    child.kill('SIGKILL');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstThumbnailUrl(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null;
  }
  for (const item of value) {
    if (isRecord(item) && typeof item.url === 'string') {
      return item.url;
    }
  }
  return null;
}

function toEntry(value: unknown): YoutubeSourceEntry {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0
  ) {
    throw new Error('yt-dlp returned an entry without a video id.');
  }
  return {
    videoId: value.id,
    title: typeof value.title === 'string' ? value.title : value.id,
    durationSeconds:
      typeof value.duration === 'number' ? Math.round(value.duration) : null,
    thumbnailUrl: firstThumbnailUrl(value.thumbnails)
  };
}

function parseSourceJson(stdout: string, info: YoutubeUrlInfo): YoutubeSource {
  const data: unknown = JSON.parse(stdout);
  if (!isRecord(data)) {
    throw new Error('yt-dlp returned an unexpected payload.');
  }

  const title = typeof data.title === 'string' ? data.title : info.sourceId;

  if (info.kind === YoutubeSourceKind.Video) {
    return {
      kind: info.kind,
      sourceId: info.sourceId,
      title,
      entries: [toEntry(data)]
    };
  }

  const rawEntries = Array.isArray(data.entries) ? data.entries : [];
  return {
    kind: info.kind,
    sourceId: info.sourceId,
    title,
    entries: rawEntries.map(entry => toEntry(entry))
  };
}

/*
 * The finished file's own duration, as a whole number of seconds. ffprobe prints
 * the container's duration as a bare float; anything that is not a number is a
 * failed probe, and a failed probe fails the download rather than storing a track
 * with a duration nobody can trust.
 */
async function probeDuration(
  binary: string,
  filePath: string,
  timeoutMs: number
): Promise<number> {
  const { stdout } = await runProcess(
    binary,
    buildProbeArgs(filePath),
    timeoutMs
  );
  const seconds = Number.parseFloat(stdout.trim());

  if (!Number.isFinite(seconds)) {
    throw new Error(`The duration probe returned no number for ${filePath}.`);
  }

  return Math.round(seconds);
}

function runProcess(
  command: string,
  args: string[],
  timeoutMs: number
): Promise<RunResult> {
  return new Promise<RunResult>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      settled = true;
      killProcessTree(child);
      reject(new Error(`${command} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout?.on('data', chunk => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', chunk => {
      stderr += String(chunk);
    });
    child.on('error', error => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', code => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${command} exited with code ${String(code)}: ${stderr.trim()}`
        )
      );
    });
  });
}

export class YtdlpClient implements IYoutubeClient {
  constructor(private readonly _options: YtdlpOptions) {}

  public async listSource(url: string): Promise<YoutubeSource> {
    const info = validateYoutubeUrl(url);
    const { stdout } = await runProcess(
      this._options.binary,
      buildListArgs(info),
      this._options.timeoutMs
    );
    return parseSourceJson(stdout, info);
  }

  public async downloadTrack(
    request: DownloadTrackRequest
  ): Promise<DownloadTrackResult> {
    await mkdir(request.tempDir, { recursive: true });
    await mkdir(dirname(request.outputPath), { recursive: true });

    const outputTemplate = join(request.tempDir, `${request.videoId}.%(ext)s`);
    const url = `https://www.youtube.com/watch?v=${request.videoId}`;

    try {
      await runProcess(
        this._options.binary,
        buildDownloadArgs(
          url,
          outputTemplate,
          this._options.download,
          request.skipNonMusic
        ),
        this._options.timeoutMs
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (isVideoUnavailableMessage(message)) {
        throw new YoutubeVideoUnavailableError(request.videoId);
      }

      // A SponsorBlock failure is checked after the gone-video patterns, and the
      // two do not overlap: yt-dlp's SponsorBlock phrases never match the
      // unavailable ones. This one is transient, so it becomes a typed error the
      // worker records as `failed` rather than as a terminal `unavailable`.
      if (isSponsorBlockFailureMessage(message)) {
        throw new YoutubeSponsorBlockError(request.videoId);
      }

      throw error;
    }

    const downloadedPath = join(request.tempDir, `${request.videoId}.m4a`);
    await runProcess(
      this._options.ffmpegBinary,
      buildFaststartArgs(downloadedPath, request.outputPath),
      this._options.timeoutMs
    );
    await rm(downloadedPath, { force: true });

    // The file is the truth. A trimmed file is shorter than its source, so the
    // duration is read back from what was written, for every download, trimmed or
    // not; the source metadata is only what the row carried before this.
    const durationSeconds = await probeDuration(
      this._options.ffprobeBinary,
      request.outputPath,
      this._options.timeoutMs
    );

    return {
      videoId: request.videoId,
      filePath: request.outputPath,
      durationSeconds
    };
  }

  public async fetchThumbnail(url: string, outputPath: string): Promise<void> {
    // A plain image fetch: the URL is the source's own, not yt-dlp's business, but
    // it is still source access, so it lives behind this seam with the rest.
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`The thumbnail request failed with ${response.status}.`);
    }

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
  }
}
