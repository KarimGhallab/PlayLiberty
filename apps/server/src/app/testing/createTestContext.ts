import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { FastifyInstance } from 'fastify';

import type { LiveEvent } from '@playliberty/contracts';
import type { IYoutubeClient } from '@playliberty/youtube';

import { EventBus } from '../../shared/events/eventBus/EventBus.js';

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
  cleanup(): Promise<void>;
}

export interface TestContextOptions {
  /*
   * The source seam. A test that exercises the sync passes a fake here and never
   * spawns yt-dlp; a test that does not care gets the real client built from
   * config, which it never calls.
   */
  youtube?: IYoutubeClient;
  /*
   * A spy a test passes to observe that a sync queued work. The background jobs
   * are off by default, so nothing replaces it and the test reads exactly what the
   * sync asked for.
   */
  kickDownloads?: () => void;
  /*
   * Whether the background download worker and prune scheduler run. Off by
   * default: a unit test drives `processPendingTracks` by hand, and a background
   * worker ticking beside it would download the same rows first and race the
   * assertions. A test that wants the loop passes `true`.
   */
  startBackgroundJobs?: boolean;
  /*
   * How long the live stream may sit idle before it writes a heartbeat. A test
   * that watches the heartbeat shortens it rather than waiting out the default.
   */
  sseHeartbeatMs?: number;
}

export async function createTestContext(
  env: NodeJS.ProcessEnv = {},
  options: TestContextOptions = {}
): Promise<TestContext> {
  const directory = await mkdtemp(join(tmpdir(), 'playliberty-test-'));
  const config = loadConfig({
    NODE_ENV: 'test',
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

  const app = await buildApp({
    config,
    database,
    mediaPaths,
    youtube: options.youtube,
    kickDownloads: options.kickDownloads,
    startBackgroundJobs: options.startBackgroundJobs ?? false,
    sseHeartbeatMs: options.sseHeartbeatMs,
    events
  });
  await app.ready();

  return {
    app,
    database,
    mediaPaths,
    events,
    directory,
    cleanup: async (): Promise<void> => {
      await app.close();
      database.sqlite.close();
      await rm(directory, { recursive: true, force: true });
    }
  };
}
