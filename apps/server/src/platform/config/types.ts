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

/* Which process reads a source: the server's own yt-dlp, or the egress agent
 * inside the tunnel. The default keeps a workstation and the tests local. */
export type YoutubeListTransport = 'local' | 'egress-agent';

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
  /* The egress agent's socket: the host owns it, the pod only connects. */
  egressAgentSocket: string;
  /* The rotation policy: failures before a switch, the drain bound, and the
   * cooldown that keeps a burst of parallel failures from walking the pool. */
  egressFailureLimit: number;
  egressDrainTimeoutMs: number;
  egressSwitchCooldownMs: number;
  pruneCron: string;
  ytdlpBinary: string;
  youtubeTransport: YoutubeListTransport;
  ffmpegBinary: string;
  ffprobeBinary: string;
  downloadTimeoutMs: number;
  download: DownloadConfig;
  /* The E2E fake adapter's scenario file, read only under `NODE_ENV=test`.
   * The fake is not even imported otherwise. */
  e2eFakeScript: string | null;
}
