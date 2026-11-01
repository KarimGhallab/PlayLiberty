import { randomUUID } from 'node:crypto';

import fastifyStatic from '@fastify/static';
import type {
  FastifyError,
  FastifyInstance,
  FastifyServerOptions
} from 'fastify';
import Fastify from 'fastify';

import type { LiveEvent } from '@playliberty/contracts';
import { ProblemCode } from '@playliberty/contracts';
import {
  EgressAgentClient,
  EgressAgentFetcher,
  YtdlpClient,
  YtdlpFetcher
} from '@playliberty/youtube';

import type { AppContext } from '../shared/context.js';
import { EventBus } from '../shared/events/eventBus/EventBus.js';
import { sendProblem } from '../shared/problem.js';

import { registerAccountRoutes } from '../features/accounts/routes/accountRoutes.js';
import { PangolinClient } from '../features/auth/pangolin/PangolinClient.js';
import { registerAuthRoutes } from '../features/auth/routes/authRoutes/authRoutes.js';
import { registerSessionRoutes } from '../features/auth/routes/sessionRoutes/sessionRoutes.js';
import { ProvisioningService } from '../features/auth/service/ProvisioningService.js';
import { runStartupSweep } from '../features/downloads/startupSweep/startupSweep.js';
import type { DownloadWorkerHandle } from '../features/downloads/worker/downloadWorker.js';
import { startDownloadWorker } from '../features/downloads/worker/downloadWorker.js';
import { registerEgressRoutes } from '../features/egress/routes/egressRoutes.js';
import { EgressPolicyClient } from '../features/egress/service/egressPolicy.js';
import { reconcileEgress } from '../features/egress/service/egressService.js';
import {
  DEFAULT_EVENT_HEARTBEAT_MS,
  registerEventRoutes
} from '../features/events/routes/eventRoutes.js';
import { registerCoverRoutes } from '../features/playlists/cover/routes/coverRoutes.js';
import { registerPlaylistRoutes } from '../features/playlists/routes/playlistRoutes.js';
import {
  pruneExpiredCredentials,
  pruneOrphanCovers,
  pruneOrphanTracks
} from '../features/prune/service/pruneService.js';
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
  /* The egress agent's client; a test passes a fake, a real process builds it. */
  egressAgent?: AppContext['egressAgent'];
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
  /* The token issuer: a test passes a fake, a real process builds it from
   * config. */
  pangolin?: AppContext['pangolin'];
  /* The credential clock; a test moves it to reach expiry, the rate limit's
   * window and the lifetimes without waiting. */
  now?: () => number;
  /* A test's logger, so it can read the audit lines the app writes. */
  loggerInstance?: FastifyServerOptions['loggerInstance'];
}

/* The test harness module is resolved at runtime, so the production build does
 * not pull it in; the harness build compiles it. */
interface E2eRoutesModule {
  registerE2eRoutes(app: FastifyInstance, context: AppContext): void;
}

function createYoutubeClient(
  config: AppContext['config'],
  egressAgent: AppContext['egressAgent']
): AppContext['youtube'] {
  const options = {
    binary: config.ytdlpBinary,
    ffmpegBinary: config.ffmpegBinary,
    ffprobeBinary: config.ffprobeBinary,
    timeoutMs: config.downloadTimeoutMs,
    download: config.download
  };
  const fetcher =
    config.youtubeTransport === 'egress-agent'
      ? new EgressAgentFetcher(
          egressAgent,
          config.download,
          config.downloadTimeoutMs
        )
      : new YtdlpFetcher(options);

  return new YtdlpClient(options, fetcher);
}
/* Colored logs in a terminal, JSON elsewhere. `pino-pretty` is a devDependency
 * named only as a transport target, which is why knip leaves it alone. */
function createLoggerOptions(
  config: AppContext['config']
): FastifyServerOptions['logger'] {
  const pretty =
    config.runtime === 'development' && process.stdout.isTTY === true;

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
  const egressAgent =
    options.egressAgent ??
    new EgressAgentClient(options.config.egressAgentSocket);

  const baseYoutube =
    options.youtube ?? createYoutubeClient(options.config, egressAgent);
  /* A test's fake already answers for itself; the policy only wraps the real
   * transport, where an exit can actually be blamed. */
  const youtube =
    options.youtube === undefined &&
    options.config.youtubeTransport === 'egress-agent'
      ? new EgressPolicyClient(baseYoutube, {
          database: options.database,
          agent: egressAgent,
          failureLimit: options.config.egressFailureLimit,
          switchCooldownMs: options.config.egressSwitchCooldownMs,
          drainTimeoutMs: options.config.egressDrainTimeoutMs
        })
      : baseYoutube;

  const context: AppContext = {
    config: options.config,
    database: options.database,
    mediaPaths: options.mediaPaths,
    youtube,
    egressAgent,
    kickDownloads: options.kickDownloads ?? (() => undefined),
    events: options.events ?? new EventBus<LiveEvent>(),
    pangolin:
      options.pangolin ??
      (options.config.pangolin === null
        ? null
        : new PangolinClient(options.config.pangolin)),
    provisioning: new ProvisioningService(options.now),
    now: options.now ?? Date.now
  };

  const loggerOptions =
    options.loggerInstance === undefined
      ? { logger: createLoggerOptions(context.config) }
      : { loggerInstance: options.loggerInstance };

  const app = Fastify({
    ...loggerOptions,
    trustProxy: 'loopback',
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
  registerAuthRoutes(app, context);

  await app.register(
    async api => {
      registerAccountRoutes(api, context);
      registerSessionRoutes(api, context);
      registerEgressRoutes(api, context);
      registerPlaylistRoutes(api, context);
      registerCoverRoutes(api, context);
      registerShareRoutes(api, context);
      registerSyncRunRoutes(api, context);
      registerTrackRoutes(api, context);
      registerEventRoutes(api, context, {
        heartbeatMs: options.sseHeartbeatMs ?? DEFAULT_EVENT_HEARTBEAT_MS
      });

      /* The E2E reset. Not API surface: it needs both the test runtime and the
       * explicit harness flag, and the production build omits the module. */
      if (context.config.runtime === 'test' && context.config.e2eHarness) {
        // Not a literal, so the production build does not compile the module.
        const modulePath: string = './testing/e2eRoutes.js';
        const harness = (await import(modulePath)) as E2eRoutesModule;
        harness.registerE2eRoutes(api, context);
      }
    },
    { prefix: '/api/v1' }
  );

  let worker: DownloadWorkerHandle | null = null;
  let scheduler: JobHandle | null = null;

  app.addHook('onReady', async () => {
    const reachable = await reconcileEgress(
      context.database,
      context.egressAgent
    );

    if (!reachable) {
      // The host may start the agent after the server; the first read retries.
      app.log.warn('the egress agent is unreachable at boot');
    }

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
        const pruneOptions = {
          database: context.database,
          mediaPaths: context.mediaPaths,
          logger: app.log,
          signal
        };

        await pruneOrphanTracks(pruneOptions);
        await pruneOrphanCovers(pruneOptions);
        pruneExpiredCredentials({
          database: context.database,
          logger: app.log,
          now: context.now
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
