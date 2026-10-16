import { randomUUID } from 'node:crypto';

import fastifyStatic from '@fastify/static';
import type {
  FastifyError,
  FastifyInstance,
  FastifyServerOptions
} from 'fastify';
import Fastify from 'fastify';

import { ProblemCode } from '@playliberty/contracts';
import type { LiveEvent } from '@playliberty/contracts';
import { YtdlpClient } from '@playliberty/youtube';

import type { AppContext } from '../shared/context.js';
import { EventBus } from '../shared/events/eventBus/EventBus.js';
import { sendProblem } from '../shared/problem.js';

import { registerAccountRoutes } from '../features/accounts/routes/accountRoutes.js';
import { runStartupSweep } from '../features/downloads/startupSweep/startupSweep.js';
import type { DownloadWorkerHandle } from '../features/downloads/worker/downloadWorker.js';
import { startDownloadWorker } from '../features/downloads/worker/downloadWorker.js';
import {
  DEFAULT_EVENT_HEARTBEAT_MS,
  registerEventRoutes
} from '../features/events/routes/eventRoutes.js';
import { registerPlaylistRoutes } from '../features/playlists/routes/playlistRoutes.js';
import { pruneOrphanTracks } from '../features/prune/service/pruneService.js';
import { registerShareRoutes } from '../features/shares/routes/shareRoutes.js';
import { registerSyncRunRoutes } from '../features/sync/routes/syncRunRoutes.js';
import { registerTrackRoutes } from '../features/tracks/routes/trackRoutes.js';
import type { JobHandle } from '../platform/jobs/cronJob.js';
import { startCronJob } from '../platform/jobs/cronJob.js';
import { registerHealthRoutes } from './health/healthRoutes/healthRoutes.js';
import { registerCsrfHook } from './hooks/csrf/csrf.js';
import { registerIdentityHook } from './hooks/identity/identity.js';

/* `youtube` is optional only here, resolved from config, so downstream gets a
 * complete AppContext and never checks for a missing adapter. */
export interface AppOptions {
  config: AppContext['config'];
  database: AppContext['database'];
  mediaPaths: AppContext['mediaPaths'];
  youtube?: AppContext['youtube'];
  /* A test's replacement for the worker wake-up; real `onReady` swaps in the
   * worker's own kick. */
  kickDownloads?: () => void;
  /* Whether the background loops start. A unit test that drives a pass by hand
   * turns it off so the worker does not race its assertions. */
  startBackgroundJobs?: boolean;
  /* The live stream's idle heartbeat interval; a test that watches it shortens
   * it. */
  sseHeartbeatMs?: number;
  /* The live bus: a real process gets one built here, a test passes its own. */
  events?: AppContext['events'];
  /* A test's logger, so it can read the audit lines the app writes. */
  loggerInstance?: FastifyServerOptions['loggerInstance'];
}

function createYoutubeClient(
  config: AppContext['config']
): AppContext['youtube'] {
  return new YtdlpClient({
    binary: config.ytdlpBinary,
    ffmpegBinary: config.ffmpegBinary,
    ffprobeBinary: config.ffprobeBinary,
    timeoutMs: config.downloadTimeoutMs,
    download: config.download
  });
}
/* Colored logs in a terminal, JSON elsewhere. `pino-pretty` is a devDependency
 * named only as a transport target, which is why knip leaves it alone. */
function createLoggerOptions(
  config: AppContext['config']
): FastifyServerOptions['logger'] {
  const pretty =
    config.nodeEnv === 'development' && process.stdout.isTTY === true;

  if (!pretty) {
    return { level: config.logLevel };
  }

  return {
    level: config.logLevel,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname'
      }
    }
  };
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const context: AppContext = {
    config: options.config,
    database: options.database,
    mediaPaths: options.mediaPaths,
    youtube: options.youtube ?? createYoutubeClient(options.config),
    kickDownloads: options.kickDownloads ?? (() => undefined),
    events: options.events ?? new EventBus<LiveEvent>()
  };

  const loggerOptions =
    options.loggerInstance === undefined
      ? { logger: createLoggerOptions(context.config) }
      : { loggerInstance: options.loggerInstance };

  const app = Fastify({
    ...loggerOptions,
    genReqId: request => {
      const header = request.headers['x-request-id'];

      if (typeof header === 'string' && header.length > 0) {
        return header;
      }

      return randomUUID();
    }
  });

  await app.register(fastifyStatic, {
    root: context.mediaPaths.root,
    serve: false
  });

  registerIdentityHook(app, context);
  registerCsrfHook(app, { publicOrigin: context.config.publicOrigin });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, 'request failed');
    const status = error.statusCode ?? 500;

    return sendProblem(reply, {
      status,
      code:
        status >= 500 ? ProblemCode.InternalError : ProblemCode.RequestError,
      title: status >= 500 ? 'Internal Server Error' : 'Request Error',
      detail: status >= 500 ? undefined : error.message
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return sendProblem(reply, {
      status: 404,
      code: ProblemCode.NotFound,
      title: 'Not Found'
    });
  });

  registerHealthRoutes(app, context);

  await app.register(
    async api => {
      registerAccountRoutes(api, context);
      registerPlaylistRoutes(api, context);
      registerShareRoutes(api, context);
      registerSyncRunRoutes(api, context);
      registerTrackRoutes(api, context);
      registerEventRoutes(api, context, {
        heartbeatMs: options.sseHeartbeatMs ?? DEFAULT_EVENT_HEARTBEAT_MS
      });

      /* The E2E reset. Not API surface, only under `NODE_ENV=test`, under API
       * prefix so the browser reaches it through the proxy. */
      if (context.config.nodeEnv === 'test') {
        const { registerE2eRoutes } = await import('./testing/e2eRoutes.js');
        registerE2eRoutes(api, context);
      }
    },
    { prefix: '/api/v1' }
  );

  let worker: DownloadWorkerHandle | null = null;
  let scheduler: JobHandle | null = null;

  app.addHook('onReady', async () => {
    const sweep = await runStartupSweep(context.mediaPaths, context.database);
    app.log.info({ ...sweep }, 'startup sweep finished');

    if (options.startBackgroundJobs === false) {
      return;
    }

    worker = startDownloadWorker({
      context,
      concurrency: context.config.download.concurrency,
      logger: app.log
    });
    context.kickDownloads = worker.kick;
    scheduler = startCronJob({
      cron: context.config.pruneCron,
      logger: app.log,
      run: async (signal: AbortSignal): Promise<void> => {
        await pruneOrphanTracks({
          database: context.database,
          mediaPaths: context.mediaPaths,
          logger: app.log,
          signal
        });
      }
    });
  });

  app.addHook('onClose', async () => {
    scheduler?.stop();
    await worker?.stop();
  });

  return app;
}
