import type { DownloadOptions } from '@playliberty/youtube';

/* Which process reads a source: the server's own yt-dlp, or the egress agent
 * inside the tunnel. The default keeps a workstation and the tests local. */
export type YoutubeListTransport = 'local' | 'egress-agent';

/* The only three shapes a process runs in. Anything unrecognised is treated as
 * production, so an unknown NODE_ENV cannot relax a boot rule. */
export type Runtime = 'test' | 'development' | 'production';

export interface Config {
  runtime: Runtime;
  port: number;
  host: string;
  logLevel: string;
  mediaRoot: string;
  databasePath: string;
  publicOrigin: string | null;
  /* The secret the edge injects, required so a request at the port directly
   * cannot forge the identity headers. Required outside the test harness. */
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
  download: DownloadOptions;
  /* The explicit test-harness opt-in. The E2E routes and the fake adapter are
   * unreachable without it, even under the test runtime. */
  e2eHarness: boolean;
  /* The E2E fake adapter's scenario file, read only under the test harness.
   * The fake is not even imported otherwise. */
  e2eFakeScript: string | null;
}
