import type { ChildProcess } from 'node:child_process';

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
  durationSeconds: number;
}

export interface FetchTrackRequest {
  videoId: string;
  tempDir: string;
  skipNonMusic: boolean;
}

/* The path the tool wrote, not one derived from the video id: the format
 * selection can fall back, and the extension follows it. */
export interface FetchedTrack {
  videoId: string;
  filePath: string;
}

export interface ISourceFetcher {
  listSource(url: string): Promise<YoutubeSource>;
  fetchTrack(request: FetchTrackRequest): Promise<FetchedTrack>;
}

export interface IEgressAgentClient {
  status(): Promise<EgressAgentStatus>;
  /* The switch action applies the config if needed, then checks it. */
  switch(name?: string): Promise<EgressCheckFacts>;
  /* The check action reads the active config and never switches. */
  check(): Promise<EgressCheckFacts>;
  /* The rotation primitive: apply the config without checking it. */
  applyConfig(name: string, drainTimeoutMs: number): Promise<EgressAgentStatus>;
  list(url: string): Promise<YoutubeSource>;
  fetchTrack(request: AgentFetchRequest): Promise<FetchedTrack>;
}

/* The server owns the download options; they travel per request so the agent
 * has no second configuration surface. */
export interface AgentFetchRequest extends FetchTrackRequest {
  download: DownloadOptions;
  timeoutMs: number;
}

export type EgressFailure = 'blocked' | 'unavailable' | 'network' | 'unknown';

/* The three facts a check measures, plus the active config. A null handshake
 * means no interface is configured, not a failure. */
export interface EgressCheckFacts {
  handshake: boolean | null;
  listing: boolean;
  exitIp: string | null;
  reason: EgressFailure | null;
  active: string | null;
}

export interface EgressAgentStatus {
  pool: EgressAgentConfig[];
  active: string | null;
  loadedSince: string | null;
}

export interface EgressAgentConfig {
  name: string;
  endpoint: string | null;
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

/* A switch must be able to drain, then kill, a tool that is still running. The
 * tracker returns its own release, so a finished child is forgotten. */
export type ProcessTracker = (child: ChildProcess) => () => void;

export interface YtdlpFetcherOptions {
  binary: string;
  timeoutMs: number;
  download: DownloadOptions;
  trackProcess?: ProcessTracker;
}

export interface FinalizeAudioOptions {
  ffmpegBinary: string;
  ffprobeBinary: string;
  timeoutMs: number;
}

export interface FinalizeAudioRequest {
  inputPath: string;
  outputPath: string;
}

export interface YtdlpOptions extends YtdlpFetcherOptions {
  ffmpegBinary: string;
  ffprobeBinary: string;
  thumbnailTimeoutMs?: number;
  thumbnailMaxBytes?: number;
}

export interface IYoutubeClient {
  listSource(url: string): Promise<YoutubeSource>;
  downloadTrack(request: DownloadTrackRequest): Promise<DownloadTrackResult>;
  fetchThumbnail(url: string, outputPath: string): Promise<void>;
}
