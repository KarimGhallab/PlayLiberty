import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { finalizeAudio } from '../audio/audio.js';
import {
  YoutubeSponsorBlockError,
  YoutubeVideoUnavailableError,
  isSponsorBlockFailureMessage,
  isVideoUnavailableMessage
} from '../errors/errors.js';
import { runProcess } from '../process/runProcess.js';
import type {
  DownloadOptions,
  DownloadTrackRequest,
  DownloadTrackResult,
  FetchTrackRequest,
  FetchedTrack,
  ISourceFetcher,
  IYoutubeClient,
  YoutubeSource,
  YoutubeSourceEntry,
  YoutubeUrlInfo,
  YtdlpFetcherOptions,
  YtdlpOptions
} from '../types.js';
import { YoutubeSourceKind } from '../types.js';
import {
  isValidVideoId,
  validateYoutubeUrl
} from '../validateYoutubeUrl/validateYoutubeUrl.js';

/* `--use-extractors` matches exactly and `youtube*` matches nothing, so both
 * names are listed; both are YouTube, so a URL cannot route to another site. */
const YOUTUBE_EXTRACTORS = 'youtube,youtube:tab';

/* `music_offtopic` is the music stopping; `sponsor` and `selfpromo` cover the
 * spoken breaks. Fixed in code: one behaviour, not a configuration surface. */
const SPONSORBLOCK_CATEGORIES = 'music_offtopic,sponsor,selfpromo';

const THUMBNAIL_HOSTS = new Set(['ytimg.com', 'img.youtube.com']);
const THUMBNAIL_HOST_SUFFIX = '.ytimg.com';

/* A thumbnail is small and fast, so a slow or oversized response is a fault,
 * not something to wait out. A redirect is followed only on an allowed host. */
const DEFAULT_THUMBNAIL_TIMEOUT_MS = 15_000;
const DEFAULT_THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;
const THUMBNAIL_MAX_REDIRECTS = 3;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/* yt-dlp writes these beside a finished file while it works; they are never a
 * download. */
const PARTIAL_SUFFIXES = ['.part', '.ytdl'];

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

/* The extension is not knowable before the run, because the format selection
 * can fall back, so the file is discovered rather than assumed. A leftover from
 * an earlier attempt loses to the newest. */
async function findFetchedFile(
  tempDir: string,
  videoId: string
): Promise<string> {
  const prefix = `${videoId}.`;
  const names = (await readdir(tempDir, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.startsWith(prefix))
    .map(entry => entry.name)
    .filter(name => !PARTIAL_SUFFIXES.some(suffix => name.endsWith(suffix)));

  if (names.length === 0) {
    throw new Error(`yt-dlp wrote no file for ${videoId}.`);
  }

  const paths = names.map(name => join(tempDir, name));

  if (paths.length === 1) {
    return paths[0];
  }

  const stats = await Promise.all(paths.map(path => stat(path)));
  let newest = 0;

  for (let index = 1; index < stats.length; index += 1) {
    if (stats[index].mtimeMs > stats[newest].mtimeMs) {
      newest = index;
    }
  }

  return paths[newest];
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

export function toEntry(value: unknown): YoutubeSourceEntry {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isValidVideoId(value.id)
  ) {
    throw new Error('yt-dlp returned an entry without a valid video id.');
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

function isAllowedThumbnailHost(host: string): boolean {
  return THUMBNAIL_HOSTS.has(host) || host.endsWith(THUMBNAIL_HOST_SUFFIX);
}

/* Pinned to https and the image hosts. A redirect is resolved against the
 * current URL, then re-checked, so one leaving the allowlist is refused. */
function resolveThumbnailUrl(raw: string, base?: string): string {
  let parsed: URL;

  try {
    parsed = new URL(raw, base);
  } catch {
    throw new Error('The thumbnail URL is not a valid absolute URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('The thumbnail URL must use https.');
  }

  const host = parsed.hostname.toLowerCase();

  if (!isAllowedThumbnailHost(host)) {
    throw new Error(
      `The thumbnail host ${host} is not an allowed YouTube image host.`
    );
  }

  return parsed.toString();
}

/* Read through the cap, not buffered whole, so an oversized response is refused
 * without being held in memory. */
async function readBoundedThumbnail(
  response: Response,
  maxBytes: number
): Promise<Buffer> {
  const declared = response.headers.get('content-length');

  if (declared !== null && Number(declared) > maxBytes) {
    throw new Error(`The thumbnail is larger than ${maxBytes} bytes.`);
  }

  const body = response.body;

  if (body === null) {
    return Buffer.alloc(0);
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    total += value.byteLength;

    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`The thumbnail is larger than ${maxBytes} bytes.`);
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

async function fetchThumbnailImage(
  raw: string,
  timeoutMs: number,
  maxBytes: number
): Promise<Buffer> {
  let current = resolveThumbnailUrl(raw);

  for (let hop = 0; hop <= THUMBNAIL_MAX_REDIRECTS; hop += 1) {
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get('location');

      if (location === null) {
        throw new Error('The thumbnail redirect had no location.');
      }

      current = resolveThumbnailUrl(location, current);
      continue;
    }

    if (!response.ok) {
      throw new Error(`The thumbnail request failed with ${response.status}.`);
    }

    return readBoundedThumbnail(response, maxBytes);
  }

  throw new Error('The thumbnail request redirected too many times.');
}

/* Source access only: what the tool returns, before the store shapes it. */
export class YtdlpFetcher implements ISourceFetcher {
  constructor(private readonly _options: YtdlpFetcherOptions) {}

  public async listSource(url: string): Promise<YoutubeSource> {
    const info = validateYoutubeUrl(url);
    const { stdout } = await runProcess(
      this._options.binary,
      buildListArgs(info),
      this._options.timeoutMs,
      this._options.trackProcess
    );
    return parseSourceJson(stdout, info);
  }

  public async fetchTrack(request: FetchTrackRequest): Promise<FetchedTrack> {
    await mkdir(request.tempDir, { recursive: true });

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
        this._options.timeoutMs,
        this._options.trackProcess
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (isVideoUnavailableMessage(message)) {
        throw new YoutubeVideoUnavailableError(request.videoId);
      }

      // Checked after the gone-video patterns, which never overlap: this one is
      // transient, so it is recorded `failed`, not terminal `unavailable`.
      if (isSponsorBlockFailureMessage(message)) {
        throw new YoutubeSponsorBlockError(request.videoId);
      }

      throw error;
    }

    return {
      videoId: request.videoId,
      filePath: await findFetchedFile(request.tempDir, request.videoId)
    };
  }
}

/* The stored file, from source access plus the audio pipeline. The fetcher is
 * injectable so a transport that is not this binary can supply the bytes. */
export class YtdlpClient implements IYoutubeClient {
  private readonly _options: YtdlpOptions;
  private readonly _fetcher: ISourceFetcher;

  constructor(options: YtdlpOptions, fetcher?: ISourceFetcher) {
    this._options = options;
    this._fetcher = fetcher ?? new YtdlpFetcher(options);
  }

  public async listSource(url: string): Promise<YoutubeSource> {
    return this._fetcher.listSource(url);
  }

  public async downloadTrack(
    request: DownloadTrackRequest
  ): Promise<DownloadTrackResult> {
    const fetched = await this._fetcher.fetchTrack({
      videoId: request.videoId,
      tempDir: request.tempDir,
      skipNonMusic: request.skipNonMusic
    });

    try {
      const durationSeconds = await finalizeAudio(
        {
          ffmpegBinary: this._options.ffmpegBinary,
          ffprobeBinary: this._options.ffprobeBinary,
          timeoutMs: this._options.timeoutMs
        },
        { inputPath: fetched.filePath, outputPath: request.outputPath }
      );

      return {
        videoId: request.videoId,
        filePath: request.outputPath,
        durationSeconds
      };
    } finally {
      /* The raw download is scratch: the stored file is the remuxed one. A
       * fetcher that already writes the output path keeps it. */
      if (fetched.filePath !== request.outputPath) {
        await rm(fetched.filePath, { force: true });
      }
    }
  }

  public async fetchThumbnail(url: string, outputPath: string): Promise<void> {
    /* Still source access, though not yt-dlp's, so it lives behind this seam
     * with the rest: pinned to the image hosts and bounded. */
    const image = await fetchThumbnailImage(
      url,
      this._options.thumbnailTimeoutMs ?? DEFAULT_THUMBNAIL_TIMEOUT_MS,
      this._options.thumbnailMaxBytes ?? DEFAULT_THUMBNAIL_MAX_BYTES
    );

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, image);
  }
}
