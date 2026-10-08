import type { IYoutubeClient } from '@playliberty/youtube';

import { buildApp } from './app/buildApp.js';

import { loadConfig } from './platform/config/loadConfig/loadConfig.js';
import { createDatabase } from './platform/database/client.js';
import { runMigrations } from './platform/database/migrate/migrate.js';
import {
  createMediaPaths,
  ensureMediaDirectories
} from './platform/media/mediaPaths.js';

/*
 * The one seam an end-to-end run fakes. It is a dynamic import behind two
 * conditions so a production process neither carries the module nor reaches it:
 * `NODE_ENV` must be `test`, and a scenario path must be set. Both are absent in
 * any real deployment, and the import is the only reference to the fake anywhere
 * in the shipped code.
 */
async function createYoutubeOverride(
  nodeEnv: string,
  scriptPath: string | null
): Promise<IYoutubeClient | undefined> {
  if (nodeEnv !== 'test' || scriptPath === null) {
    return undefined;
  }

  const { createE2eYoutube } =
    await import('./app/testing/e2eYoutube/e2eYoutube.js');

  return createE2eYoutube(scriptPath);
}

async function main(): Promise<void> {
  const config = loadConfig();

  const database = createDatabase(config.databasePath);
  runMigrations(database);

  const mediaPaths = createMediaPaths(config.mediaRoot);
  await ensureMediaDirectories(mediaPaths);

  const youtube = await createYoutubeOverride(
    config.nodeEnv,
    config.e2eFakeScript
  );

  const app = await buildApp({ config, database, mediaPaths, youtube });

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
