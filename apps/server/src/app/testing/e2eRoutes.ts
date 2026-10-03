import { rm } from 'node:fs/promises';

import type { FastifyInstance } from 'fastify';

import type { AppContext } from '../../shared/context.js';

import {
  accounts,
  associations,
  playlists,
  shares,
  suppressions,
  syncRuns,
  tracks
} from '../../platform/database/schema.js';
import { ensureMediaDirectories } from '../../platform/media/mediaPaths.js';

/*
 * The one route an end-to-end run needs that is not part of the product: a reset
 * between tests.
 *
 * Every test drives the same browser identity through the Vite dev proxy and so
 * the same account and database, which is what makes the run real. Isolation is
 * therefore the run's problem, not the product's, and this is the smallest way to
 * give it: truncate every table and clear the media store so the next test starts
 * on an empty instance.
 *
 * It is registered only when `NODE_ENV` is `test`. A production process never
 * mounts it, so there is no reset endpoint to guard beyond the flag; the guard is
 * the registration, which is stronger than an in-route check because the route
 * does not exist to be reached.
 */
export function registerE2eRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  app.post('/__e2e__/reset', async (_request, reply) => {
    context.database.sqlite.transaction(() => {
      // Children first, because the foreign keys are enforced.
      context.database.db.delete(associations).run();
      context.database.db.delete(suppressions).run();
      context.database.db.delete(shares).run();
      context.database.db.delete(syncRuns).run();
      context.database.db.delete(playlists).run();
      context.database.db.delete(tracks).run();
      context.database.db.delete(accounts).run();
    })();

    await rm(context.mediaPaths.mediaDir, { recursive: true, force: true });
    await rm(context.mediaPaths.thumbnailsDir, {
      recursive: true,
      force: true
    });
    await ensureMediaDirectories(context.mediaPaths);

    return reply.code(204).send();
  });
}
