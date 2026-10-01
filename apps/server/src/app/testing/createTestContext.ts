import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { FastifyInstance } from 'fastify';

import type { IYoutubeClient } from '@playliberty/youtube';

import { loadConfig } from '../../platform/config/loadConfig.js';
import { createDatabase } from '../../platform/database/client.js';
import type { DatabaseHandle } from '../../platform/database/client.js';
import { runMigrations } from '../../platform/database/migrate.js';
import {
  createMediaPaths,
  ensureMediaDirectories
} from '../../platform/media/mediaPaths.js';
import type { MediaPaths } from '../../platform/media/mediaPaths.js';
import { buildApp } from '../buildApp.js';

export interface TestContext {
  app: FastifyInstance;
  database: DatabaseHandle;
  mediaPaths: MediaPaths;
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

  const app = await buildApp({
    config,
    database,
    mediaPaths,
    youtube: options.youtube
  });
  await app.ready();

  return {
    app,
    database,
    mediaPaths,
    directory,
    cleanup: async (): Promise<void> => {
      await app.close();
      database.sqlite.close();
      await rm(directory, { recursive: true, force: true });
    }
  };
}
