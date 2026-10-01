import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  YoutubeVideoUnavailableError,
  isVideoUnavailableMessage
} from './errors.js';
import { YoutubeSourceKind } from './types.js';
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
import { validateYoutubeUrl } from './validateYoutubeUrl.js';

export function buildListArgs(info: YoutubeUrlInfo): string[] {
  return [
    '--ignore-config',
    '--use-extractors',
    'youtube',
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
  options: DownloadOptions
): string[] {
  return [
    '--ignore-config',
    '--use-extractors',
    'youtube',
    '--js-runtimes',
    'node',
    '-f',
    'bestaudio[ext=m4a]/bestaudio',
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
        buildDownloadArgs(url, outputTemplate, this._options.download),
        this._options.timeoutMs
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (isVideoUnavailableMessage(message)) {
        throw new YoutubeVideoUnavailableError(request.videoId);
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

    return { videoId: request.videoId, filePath: request.outputPath };
  }
}
