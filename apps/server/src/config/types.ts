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
}
