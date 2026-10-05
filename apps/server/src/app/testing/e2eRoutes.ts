import { rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { TrackFileStatus } from '@playliberty/contracts';

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
 * How often the drain route looks at the database, and how long it will look
 * before giving up. A pass copies a small file, so a few polls cover one; the
 * deadline is generous enough for a scenario of ten tracks and short enough that a
 * stuck worker fails the test rather than hanging it.
 */
const DRAIN_POLL_MS = 25;
const DRAIN_DEADLINE_MS = 20_000;

/*
 * The routes an end-to-end run needs that are not part of the product: a reset
 * between tests, and a way to make the download worker run now.
 *
 * Every test drives the same browser identity through the Vite dev proxy and so
 * the same account and database, which is what makes the run real. Isolation is
 * therefore the run's problem, not the product's, and the reset is the smallest
 * way to give it: truncate every table and clear the media store so the next test
 * starts on an empty instance.
 *
 * It is registered only when `NODE_ENV` is `test`. A production process never
 * mounts it, so there is no endpoint to guard beyond the flag; the guard is the
 * registration, which is stronger than an in-route check because the route does
 * not exist to be reached.
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

  /*
   * Drain the download backlog now.
   *
   * The worker claims `DOWNLOAD_CONCURRENCY` tracks per pass on a 30-second
   * interval, so a scenario with more stored tracks than one pass covers spends a
   * whole interval waiting on the clock rather than on the product. This wakes the
   * worker until nothing is left pending, and answers when it is, so a test that
   * seeded five tracks waits on the work instead of on the tick.
   *
   * It kicks and watches the rows, rather than kicking in a loop, because a kick
   * while a pass is already running is deliberately a no-op: the only sign a pass
   * has finished is the rows leaving `pending`, so the worker is woken again only
   * after one pass's worth of rows has moved. The loop stops when nothing is
   * pending, which includes rows a pass has just failed, because a failure is
   * `failed` and never `pending` again.
   */
  app.post('/__e2e__/download', async (_request, reply) => {
    const deadline = Date.now() + DRAIN_DEADLINE_MS;

    while (pendingTracks(context) > 0) {
      if (Date.now() >= deadline) {
        return reply.code(504).send();
      }

      context.kickDownloads();
      await delay(DRAIN_POLL_MS);
    }

    return reply.code(204).send();
  });
}

function pendingTracks(context: AppContext): number {
  return context.database.db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.fileStatus, TrackFileStatus.Pending))
    .all().length;
}
