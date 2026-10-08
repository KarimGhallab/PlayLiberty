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
  host: string;
  logLevel: string;
  mediaRoot: string;
  databasePath: string;
  publicOrigin: string | null;
  /*
   * The secret the edge injects on every request it proxies. The origin requires
   * it so a request that reaches the port directly cannot pretend to be the edge
   * and forge the identity headers. Required in production; null in a local or
   * test run, where the origin is reached without an edge and the check is off.
   */
  edgeAssertion: string | null;
  adminPangolinUserIds: string[];
  pruneCron: string;
  ytdlpBinary: string;
  ffmpegBinary: string;
  ffprobeBinary: string;
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
