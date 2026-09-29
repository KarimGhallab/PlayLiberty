import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { FastifyInstance } from 'fastify';

import { loadConfig } from '../../platform/config/loadConfig.js';
import { createDatabase } from '../../platform/database/client.js';
import type { DatabaseHandle } from '../../platform/database/client.js';
import { runMigrations } from '../../platform/database/migrate.js';
import {
  createMediaPaths,
  ensureMediaDirectories
} from '../../platform/media/mediaPaths.js';
import { buildApp } from '../buildApp.js';

export interface TestContext {
  app: FastifyInstance;
  database: DatabaseHandle;
  directory: string;
  cleanup(): Promise<void>;
}

export async function createTestContext(
  env: NodeJS.ProcessEnv = {}
): Promise<TestContext> {
  const directory = await mkdtemp(join(tmpdir(), 'playliberty-test-'));
  const config = loadConfig({
    LOG_LEVEL: 'silent',
    MEDIA_ROOT: join(directory, 'media'),
    DATABASE_PATH: join(directory, 'playliberty.db'),
    ...env
  });
  const database = createDatabase(config.databasePath);
  runMigrations(database);

  const mediaPaths = createMediaPaths(config.mediaRoot);
  await ensureMediaDirectories(mediaPaths);

  const app = await buildApp({ config, database, mediaPaths });
  await app.ready();

  return {
    app,
    database,
    directory,
    cleanup: async (): Promise<void> => {
      await app.close();
      database.sqlite.close();
      await rm(directory, { recursive: true, force: true });
    }
  };
}
