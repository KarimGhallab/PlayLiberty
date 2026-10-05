export enum YoutubeSourceKind {
  Playlist = 'playlist',
  Video = 'video'
}

export interface YoutubeSourceEntry {
  videoId: string;
  title: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
}

export interface YoutubeSource {
  kind: YoutubeSourceKind;
  sourceId: string;
  title: string;
  entries: YoutubeSourceEntry[];
}

export interface YoutubeUrlInfo {
  kind: YoutubeSourceKind;
  sourceId: string;
  url: string;
}

export interface DownloadTrackRequest {
  videoId: string;
  outputPath: string;
  tempDir: string;
  skipNonMusic: boolean;
}

export interface DownloadTrackResult {
  videoId: string;
  filePath: string;
}

export interface DownloadOptions {
  concurrency: number;
  sleepRequests: number;
  sleepIntervalMin: number;
  sleepIntervalMax: number;
  limitRate: string;
  retries: number;
  fragmentRetries: number;
  fileAccessRetries: number;
  socketTimeout: number;
}

export interface YtdlpOptions {
  binary: string;
  ffmpegBinary: string;
  timeoutMs: number;
  download: DownloadOptions;
}

export interface IYoutubeClient {
  listSource(url: string): Promise<YoutubeSource>;
  downloadTrack(request: DownloadTrackRequest): Promise<DownloadTrackResult>;
  fetchThumbnail(url: string, outputPath: string): Promise<void>;
}
