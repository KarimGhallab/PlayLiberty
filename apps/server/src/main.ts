import type { IYoutubeClient } from '@playliberty/youtube';

import type { IPangolinClient } from './shared/pangolin.js';

import { buildApp } from './app/buildApp.js';

import { loadConfig } from './platform/config/loadConfig/loadConfig.js';
import type { Runtime } from './platform/config/types.js';
import { createDatabase } from './platform/database/client.js';
import { runMigrations } from './platform/database/migrate/migrate.js';
import {
  createMediaPaths,
  ensureMediaDirectories
} from './platform/media/mediaPaths.js';

/*
 * The one seam an end-to-end run fakes: a dynamic import behind the test
 * harness and a scenario path, so production never carries or reaches the fake.
 */
async function createYoutubeOverride(
  runtime: Runtime,
  harness: boolean,
  scriptPath: string | null
): Promise<IYoutubeClient | undefined> {
  if (runtime !== 'test' || !harness || scriptPath === null) {
    return undefined;
  }

  // Not a literal, so the production build does not compile the harness.
  const modulePath: string = './app/testing/e2eYoutube/e2eYoutube.js';
  const { createE2eYoutube } = (await import(modulePath)) as {
    createE2eYoutube(scriptPath: string): IYoutubeClient;
  };

  return createE2eYoutube(scriptPath);
}

/* The edge's integration API is the second seam: a phone signs in through it,
 * and a harness run must not reach a real Pangolin. */
async function createPangolinOverride(
  runtime: Runtime,
  harness: boolean
): Promise<IPangolinClient | undefined> {
  if (runtime !== 'test' || !harness) {
    return undefined;
  }

  // Not a literal, so the production build does not compile the harness.
  const modulePath: string = './app/testing/e2ePangolin/e2ePangolin.js';
  const { createE2ePangolin } = (await import(modulePath)) as {
    createE2ePangolin(): IPangolinClient;
  };

  return createE2ePangolin();
}

async function main(): Promise<void> {
  const config = loadConfig();

  const database = createDatabase(config.databasePath);
  runMigrations(database);

  const mediaPaths = createMediaPaths(config.mediaRoot);
  await ensureMediaDirectories(mediaPaths);

  const youtube = await createYoutubeOverride(
    config.runtime,
    config.e2eHarness,
    config.e2eFakeScript
  );
  const pangolin = await createPangolinOverride(
    config.runtime,
    config.e2eHarness
  );

  const app = await buildApp({
    config,
    database,
    mediaPaths,
    youtube,
    pangolin
  });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    database.sqlite.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  await app.listen({ port: config.port, host: config.host });
  app.log.info({ port: config.port }, 'server listening');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
