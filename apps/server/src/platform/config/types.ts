export interface DownloadConfig {
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

export interface Config {
  nodeEnv: string;
  port: number;
  host: string;
  logLevel: string;
  mediaRoot: string;
  databasePath: string;
  publicOrigin: string | null;
  /* The secret the edge injects, required so a request at the port directly
   * cannot forge the identity headers. Required in production, else null. */
  edgeAssertion: string | null;
  adminPangolinUserIds: string[];
  pruneCron: string;
  ytdlpBinary: string;
  ffmpegBinary: string;
  ffprobeBinary: string;
  downloadTimeoutMs: number;
  download: DownloadConfig;
  /* The E2E fake adapter's scenario file, read only under `NODE_ENV=test`.
   * The fake is not even imported otherwise. */
  e2eFakeScript: string | null;
}
