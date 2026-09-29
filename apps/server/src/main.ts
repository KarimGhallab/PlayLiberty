import { buildApp } from './app/buildApp.js';

import { loadConfig } from './platform/config/loadConfig.js';
import { createDatabase } from './platform/database/client.js';
import { runMigrations } from './platform/database/migrate.js';
import {
  createMediaPaths,
  ensureMediaDirectories
} from './platform/media/mediaPaths.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const database = createDatabase(config.databasePath);
  runMigrations(database);

  const mediaPaths = createMediaPaths(config.mediaRoot);
  await ensureMediaDirectories(mediaPaths);

  const app = await buildApp({ config, database, mediaPaths });

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

  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info({ port: config.port }, 'server listening');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
