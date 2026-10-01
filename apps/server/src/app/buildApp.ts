import { randomUUID } from 'node:crypto';

import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import type {
  FastifyError,
  FastifyInstance,
  FastifyServerOptions
} from 'fastify';

import { YtdlpClient } from '@playliberty/youtube';

import type { AppContext } from '../shared/context.js';
import { sendProblem } from '../shared/problem.js';

import { registerAccountRoutes } from '../features/accounts/accountRoutes.js';
import { startDownloadWorker } from '../features/downloads/downloadWorker.js';
import type { DownloadWorkerHandle } from '../features/downloads/downloadWorker.js';
import { runStartupSweep } from '../features/downloads/startupSweep.js';
import { registerPlaylistRoutes } from '../features/playlists/playlistRoutes.js';
import { pruneOrphanTracks } from '../features/prune/pruneService.js';
import { registerShareRoutes } from '../features/shares/shareRoutes.js';
import { registerSyncRunRoutes } from '../features/sync/syncRunRoutes.js';
import { registerTrackRoutes } from '../features/tracks/trackRoutes.js';
import { startCronJob } from '../platform/jobs/cronJob.js';
import type { JobHandle } from '../platform/jobs/cronJob.js';
import { registerHealthRoutes } from './health/healthRoutes.js';
import { registerCsrfHook } from './hooks/csrf.js';
import { registerIdentityHook } from './hooks/identity.js';

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
}

function createYoutubeClient(
  config: AppContext['config']
): AppContext['youtube'] {
  return new YtdlpClient({
    binary: config.ytdlpBinary,
    ffmpegBinary: config.ffmpegBinary,
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
    youtube: options.youtube ?? createYoutubeClient(options.config)
  };

  const app = Fastify({
    logger: createLoggerOptions(context.config),
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
      code: status >= 500 ? 'internal_error' : 'request_error',
      title: status >= 500 ? 'Internal Server Error' : 'Request Error',
      detail: status >= 500 ? undefined : error.message
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return sendProblem(reply, {
      status: 404,
      code: 'not_found',
      title: 'Not Found'
    });
  });

  registerHealthRoutes(app, context);

  await app.register(
    async api => {
      // The two registrars taking no context are the two with nothing to read from
      // it: everything they serve comes off the request. They are left without the
      // parameter rather than handed one they do not use, so that a registrar
      // taking the context means it needs the context.
      registerAccountRoutes(api);
      registerPlaylistRoutes(api, context);
      registerShareRoutes(api);
      registerSyncRunRoutes(api, context);
      registerTrackRoutes(api, context);
    },
    { prefix: '/api/v1' }
  );

  let worker: DownloadWorkerHandle | null = null;
  let scheduler: JobHandle | null = null;

  app.addHook('onReady', async () => {
    const sweep = await runStartupSweep(context.mediaPaths, context.database);
    app.log.info({ ...sweep }, 'startup sweep finished');

    worker = startDownloadWorker({ context, logger: app.log });
    scheduler = startCronJob({
      cron: context.config.pruneCron,
      logger: app.log,
      run: async (): Promise<void> => {
        await pruneOrphanTracks({
          database: context.database,
          mediaPaths: context.mediaPaths,
          logger: app.log
        });
      }
    });
  });

  app.addHook('onClose', async () => {
    scheduler?.stop();
    worker?.stop();
  });

  return app;
}
