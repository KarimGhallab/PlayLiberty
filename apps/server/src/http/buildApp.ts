import { randomUUID } from 'node:crypto';

import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import type { FastifyError, FastifyInstance } from 'fastify';

import { registerAccountRoutes } from '../accounts/accountRoutes.js';
import { registerAuthHook } from '../auth/authHook.js';
import { registerCsrfGuard } from '../csrf/csrfGuard.js';
import { sendProblem } from '../errors/problem.js';
import { registerHealthRoutes } from '../health/healthRoutes.js';
import { runStartupSweep } from '../media/startupSweep.js';
import { registerPlaylistRoutes } from '../playlists/playlistRoutes.js';
import { startPruneScheduler } from '../prune/pruneScheduler.js';
import type { PruneSchedulerHandle } from '../prune/pruneScheduler.js';
import { pruneOrphanTracks } from '../prune/pruneService.js';
import { registerShareRoutes } from '../shares/shareRoutes.js';
import { registerTrackRoutes } from '../tracks/trackRoutes.js';
import { startDownloadWorker } from '../worker/downloadWorker.js';
import type { DownloadWorkerHandle } from '../worker/downloadWorker.js';
import type { AppOptions } from './appTypes.js';

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: options.config.logLevel },
    genReqId: request => {
      const header = request.headers['x-request-id'];

      if (typeof header === 'string' && header.length > 0) {
        return header;
      }

      return randomUUID();
    }
  });

  await app.register(fastifyStatic, {
    root: options.mediaPaths.root,
    serve: false
  });

  registerAuthHook(app, {
    database: options.database,
    adminPangolinUserIds: options.config.adminPangolinUserIds
  });
  registerCsrfGuard(app, { publicOrigin: options.config.publicOrigin });

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

  registerHealthRoutes(app, options);

  await app.register(
    async api => {
      registerAccountRoutes(api);
      registerPlaylistRoutes(api);
      registerShareRoutes(api);
      registerTrackRoutes(api, options);
    },
    { prefix: '/api/v1' }
  );

  let worker: DownloadWorkerHandle | null = null;
  let scheduler: PruneSchedulerHandle | null = null;

  app.addHook('onReady', async () => {
    const sweep = await runStartupSweep(options.mediaPaths, options.database);
    app.log.info({ ...sweep }, 'startup sweep finished');

    worker = startDownloadWorker({
      database: options.database,
      config: options.config,
      logger: app.log
    });
    scheduler = startPruneScheduler({
      cron: options.config.pruneCron,
      logger: app.log,
      prune: () =>
        pruneOrphanTracks({
          database: options.database,
          mediaPaths: options.mediaPaths,
          logger: app.log
        })
    });
  });

  app.addHook('onClose', async () => {
    scheduler?.stop();
    await worker?.stop();
  });

  return app;
}
