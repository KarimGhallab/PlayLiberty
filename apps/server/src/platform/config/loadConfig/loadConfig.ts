import { isIP } from 'node:net';

import { z } from 'zod';

import type { Config, Runtime } from '../types.js';

const optionalString = z.preprocess(
  value => (value === '' ? undefined : value),
  z.string().min(1).optional()
);

const optionalUrl = z.preprocess(
  value => (value === '' ? undefined : value),
  z.url().optional()
);

const LOOPBACK_HOSTS = new Set(['localhost', '::1', '0:0:0:0:0:0:0:1']);

function isLoopbackHost(host: string): boolean {
  return (
    LOOPBACK_HOSTS.has(host) || (isIP(host) === 4 && host.startsWith('127.'))
  );
}

/* An unrecognised environment is production, so a typo cannot relax a rule. */
function classifyRuntime(nodeEnv: string): Runtime {
  if (nodeEnv === 'test' || nodeEnv === 'development') {
    return nodeEnv;
  }

  return 'production';
}

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  HOST: z.string().min(1).default('127.0.0.1'),
  ALLOW_NON_LOOPBACK_BIND: z
    .enum(['true', 'false'])
    .default('false')
    .transform(value => value === 'true'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  MEDIA_ROOT: z.string().min(1),
  DATABASE_PATH: z.string().min(1),
  PUBLIC_ORIGIN: optionalUrl,
  EDGE_ASSERTION: optionalString,
  ADMIN_PANGOLIN_USER_IDS: z.string().default(''),
  EGRESS_AGENT_SOCKET: z
    .string()
    .min(1)
    .default('/run/playliberty/egress-agent.sock'),
  EGRESS_FAILURE_LIMIT: z.coerce.number().int().min(1).max(20).default(5),
  EGRESS_DRAIN_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  EGRESS_SWITCH_COOLDOWN_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(60000),
  PRUNE_CRON: z.string().default('0 4 * * 0'),
  DOWNLOAD_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(2),
  DOWNLOAD_SLEEP_REQUESTS: z.coerce.number().nonnegative().default(1),
  DOWNLOAD_SLEEP_INTERVAL_MIN: z.coerce.number().nonnegative().default(5),
  DOWNLOAD_SLEEP_INTERVAL_MAX: z.coerce.number().nonnegative().default(15),
  DOWNLOAD_LIMIT_RATE: z.string().default('5M'),
  DOWNLOAD_RETRIES: z.coerce.number().int().nonnegative().default(10),
  DOWNLOAD_FRAGMENT_RETRIES: z.coerce.number().int().nonnegative().default(10),
  DOWNLOAD_FILE_ACCESS_RETRIES: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(3),
  DOWNLOAD_SOCKET_TIMEOUT: z.coerce.number().int().positive().default(30),
  DOWNLOAD_TIMEOUT_MS: z.coerce.number().int().positive().default(900000),
  YTDLP_BINARY: z.string().default('yt-dlp'),
  YOUTUBE_TRANSPORT: z.enum(['local', 'egress-agent']).default('local'),
  FFMPEG_BINARY: z.string().default('ffmpeg'),
  FFPROBE_BINARY: z.string().default('ffprobe'),
  E2E_HARNESS: z
    .enum(['true', 'false'])
    .default('false')
    .transform(value => value === 'true'),
  E2E_FAKE_SCRIPT: optionalString
});

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(issue => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  const value = parsed.data;
  const runtime = classifyRuntime(value.NODE_ENV);
  const edgeAssertion = value.EDGE_ASSERTION ?? null;

  /* Without the assertion a directly reachable origin trusts whatever
   * `Remote-*` a caller sent; running open is a boot failure, not a choice. */
  if (runtime !== 'test' && edgeAssertion === null) {
    throw new Error(
      'Invalid environment configuration: EDGE_ASSERTION is required outside the test harness so the origin can tell the edge apart from a direct caller.'
    );
  }

  /* A bind beyond loopback is reachable from the network, so it takes a
   * deliberate opt-in. */
  if (!isLoopbackHost(value.HOST) && !value.ALLOW_NON_LOOPBACK_BIND) {
    throw new Error(
      `Invalid environment configuration: HOST ${value.HOST} is not loopback; use a loopback address or set ALLOW_NON_LOOPBACK_BIND=true.`
    );
  }

  return {
    runtime,
    port: value.PORT,
    host: value.HOST,
    logLevel: value.LOG_LEVEL,
    mediaRoot: value.MEDIA_ROOT,
    databasePath: value.DATABASE_PATH,
    publicOrigin: value.PUBLIC_ORIGIN ?? null,
    edgeAssertion,
    adminPangolinUserIds: value.ADMIN_PANGOLIN_USER_IDS.split(',')
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0),
    egressAgentSocket: value.EGRESS_AGENT_SOCKET,
    egressFailureLimit: value.EGRESS_FAILURE_LIMIT,
    egressDrainTimeoutMs: value.EGRESS_DRAIN_TIMEOUT_MS,
    egressSwitchCooldownMs: value.EGRESS_SWITCH_COOLDOWN_MS,
    pruneCron: value.PRUNE_CRON,
    ytdlpBinary: value.YTDLP_BINARY,
    youtubeTransport: value.YOUTUBE_TRANSPORT,
    ffmpegBinary: value.FFMPEG_BINARY,
    ffprobeBinary: value.FFPROBE_BINARY,
    downloadTimeoutMs: value.DOWNLOAD_TIMEOUT_MS,
    download: {
      concurrency: value.DOWNLOAD_CONCURRENCY,
      sleepRequests: value.DOWNLOAD_SLEEP_REQUESTS,
      sleepIntervalMin: value.DOWNLOAD_SLEEP_INTERVAL_MIN,
      sleepIntervalMax: value.DOWNLOAD_SLEEP_INTERVAL_MAX,
      limitRate: value.DOWNLOAD_LIMIT_RATE,
      retries: value.DOWNLOAD_RETRIES,
      fragmentRetries: value.DOWNLOAD_FRAGMENT_RETRIES,
      fileAccessRetries: value.DOWNLOAD_FILE_ACCESS_RETRIES,
      socketTimeout: value.DOWNLOAD_SOCKET_TIMEOUT
    },
    e2eHarness: value.E2E_HARNESS,
    e2eFakeScript: value.E2E_FAKE_SCRIPT ?? null
  };
}
