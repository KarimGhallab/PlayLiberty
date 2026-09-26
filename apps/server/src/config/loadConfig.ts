import { z } from 'zod';

import type { Config } from './types.js';

const optionalString = z.preprocess(
  value => (value === '' ? undefined : value),
  z.string().min(1).optional()
);

const optionalUrl = z.preprocess(
  value => (value === '' ? undefined : value),
  z.url().optional()
);

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  MEDIA_ROOT: z.string().min(1),
  DATABASE_PATH: z.string().min(1),
  PUBLIC_ORIGIN: optionalUrl,
  ADMIN_PANGOLIN_USER_IDS: z.string().default(''),
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
  PANGOLIN_API_URL: optionalUrl,
  PANGOLIN_RESOURCE_ID: optionalString,
  PANGOLIN_INTEGRATION_API_KEY: optionalString,
  YTDLP_BINARY: z.string().default('yt-dlp'),
  FFMPEG_BINARY: z.string().default('ffmpeg')
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

  return {
    nodeEnv: value.NODE_ENV,
    port: value.PORT,
    logLevel: value.LOG_LEVEL,
    mediaRoot: value.MEDIA_ROOT,
    databasePath: value.DATABASE_PATH,
    publicOrigin: value.PUBLIC_ORIGIN ?? null,
    adminPangolinUserIds: value.ADMIN_PANGOLIN_USER_IDS.split(',')
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0),
    pruneCron: value.PRUNE_CRON,
    ytdlpBinary: value.YTDLP_BINARY,
    ffmpegBinary: value.FFMPEG_BINARY,
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
    pangolin: {
      apiUrl: value.PANGOLIN_API_URL ?? null,
      resourceId: value.PANGOLIN_RESOURCE_ID ?? null,
      integrationApiKey: value.PANGOLIN_INTEGRATION_API_KEY ?? null
    }
  };
}
