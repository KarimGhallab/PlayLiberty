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

/*
 * What the composition root is given. `youtube` is the one optional field, and it
 * is optional in exactly one place: a caller with no adapter of its own gets the
 * real one built from config. Everything downstream receives a complete AppContext
 * and never has to check whether the adapter is there, so the substitutable seam
 * exists for tests without leaking a "maybe undefined" into every feature.
 */
export interface AppOptions {
  config: AppContext['config'];
  database: AppContext['database'];
  mediaPaths: AppContext['mediaPaths'];
  youtube?: AppContext['youtube'];
  /*
   * A test's replacement for the worker wake-up. The real `onReady` swaps in the
   * worker's own kick; a test with the background jobs off passes a spy here and
   * observes that a sync queued work, without a worker to actually download it.
   */
  kickDownloads?: () => void;
  /*
   * Whether the background loops start. True in every real process; a unit test
   * that drives `processPendingTracks` by hand turns it off so the background
   * worker does not race the assertions, which is the same seam the tests always
   * needed and only noticed now that the worker's first pass is immediate rather
   * than thirty seconds away.
   */
  startBackgroundJobs?: boolean;
  /*
   * How long the live stream may sit idle before it writes a heartbeat. The
   * default is the real one; a test that watches the heartbeat shortens it so it
   * does not wait twenty seconds for a comment frame.
   */
  sseHeartbeatMs?: number;
  /*
   * The live bus. A real process gets one built here; a test passes its own so it
   * can subscribe and observe what a feature published.
   */
  events?: AppContext['events'];
  /*
   * A test's logger, so a test can read the audit lines the app writes. A real
   * process builds its own from config and passes nothing here.
   */
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
/*
 * Human-readable colored logs while developing in a terminal, and structured
 * JSON everywhere else, so the container's collector and a piped run both get
 * the object. `pino-pretty` is a devDependency named only as a transport target
 * string, which is why knip is told to leave it alone.
 */
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

      /*
       * The E2E reset, only in a test process and only under the API prefix so
       * the browser can reach it through the same proxy the product uses. It is
       * not part of the API surface and never exists outside `NODE_ENV=test`.
       */
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
