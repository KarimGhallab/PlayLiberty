import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { FastifyInstance, FastifyServerOptions } from 'fastify';

import type { LiveEvent } from '@playliberty/contracts';
import type { IEgressAgentClient, IYoutubeClient } from '@playliberty/youtube';

import { EventBus } from '../../shared/events/eventBus/EventBus.js';
import type { IPangolinClient } from '../../shared/pangolin.js';

import { loadConfig } from '../../platform/config/loadConfig/loadConfig.js';
import type { DatabaseHandle } from '../../platform/database/client.js';
import { createDatabase } from '../../platform/database/client.js';
import { runMigrations } from '../../platform/database/migrate/migrate.js';
import type { MediaPaths } from '../../platform/media/mediaPaths.js';
import {
  createMediaPaths,
  ensureMediaDirectories
} from '../../platform/media/mediaPaths.js';
import { buildApp } from '../buildApp.js';

export interface TestContext {
  app: FastifyInstance;
  database: DatabaseHandle;
  mediaPaths: MediaPaths;
  events: EventBus<LiveEvent>;
  directory: string;
  restart(): Promise<void>;
  cleanup(): Promise<void>;
}

export interface TestContextOptions {
  /* The source seam: a sync test passes a fake, others get the real client. */
  youtube?: IYoutubeClient;
  /* The egress agent seam: an egress test passes a fake agent. */
  egressAgent?: IEgressAgentClient;
  /* A spy to observe that a sync queued work; jobs are off by default. */
  kickDownloads?: () => void;
  /* Whether the worker and scheduler run. Off by default, so a unit test that
   * drives a pass by hand is not raced by a ticking worker. */
  startBackgroundJobs?: boolean;
  /* The stream's idle heartbeat; a test that watches it shortens it. */
  sseHeartbeatMs?: number;
  /* A logger to read the audit lines; absent, the app builds one, silenced by
   * config. */
  loggerInstance?: FastifyServerOptions['loggerInstance'];
  /* The token issuer: a test passes a fake so no Pangolin instance is needed. */
  pangolin?: IPangolinClient;
  /* The credential clock: a test moves it to reach expiry, the rate limit's
   * window and the lifetimes without waiting. */
  now?: () => number;
}

export async function createTestContext(
  env: NodeJS.ProcessEnv = {},
  options: TestContextOptions = {}
): Promise<TestContext> {
  const directory = await mkdtemp(join(tmpdir(), 'playliberty-test-'));
  const config = loadConfig({
    NODE_ENV: 'test',
    E2E_HARNESS: 'true',
    LOG_LEVEL: 'silent',
    MEDIA_ROOT: join(directory, 'media'),
    DATABASE_PATH: join(directory, 'playliberty.db'),
    ...env
  });
  const database = createDatabase(config.databasePath);
  runMigrations(database);

  const mediaPaths = createMediaPaths(config.mediaRoot);
  await ensureMediaDirectories(mediaPaths);

  const events = new EventBus<LiveEvent>();

  const build = async (): Promise<FastifyInstance> => {
    const app = await buildApp({
      config,
      database,
      mediaPaths,
      youtube: options.youtube,
      egressAgent: options.egressAgent,
      kickDownloads: options.kickDownloads,
      startBackgroundJobs: options.startBackgroundJobs ?? false,
      sseHeartbeatMs: options.sseHeartbeatMs,
      loggerInstance: options.loggerInstance,
      pangolin: options.pangolin,
      now: options.now,
      events
    });
    await app.ready();
    return app;
  };

  let app = await build();

  return {
    get app() {
      return app;
    },
    database,
    mediaPaths,
    events,
    directory,
    restart: async (): Promise<void> => {
      await app.close();
      app = await build();
    },
    cleanup: async (): Promise<void> => {
      await app.close();
      database.sqlite.close();
      await rm(directory, { recursive: true, force: true });
    }
  };
}
