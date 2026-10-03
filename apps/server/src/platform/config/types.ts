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

export interface PangolinConfig {
  apiUrl: string | null;
  resourceId: string | null;
  integrationApiKey: string | null;
}

export interface Config {
  nodeEnv: string;
  port: number;
  logLevel: string;
  mediaRoot: string;
  databasePath: string;
  publicOrigin: string | null;
  adminPangolinUserIds: string[];
  pruneCron: string;
  ytdlpBinary: string;
  ffmpegBinary: string;
  downloadTimeoutMs: number;
  download: DownloadConfig;
  pangolin: PangolinConfig;
  /*
   * The E2E fake adapter's scenario file, read only when `NODE_ENV` is `test`.
   * Null in every other environment, and the fake is not even imported unless the
   * entry point sees `test`, so this never names a file in production.
   */
  e2eFakeScript: string | null;
}
