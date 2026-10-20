import { rm } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { TrackFileStatus } from '@playliberty/contracts';

import { audit } from '../../shared/audit.js';
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

/* Drain poll interval and deadline: a few polls cover a pass; the deadline
 * fails a stuck worker rather than hanging the test. */
const DRAIN_POLL_MS = 25;
const DRAIN_DEADLINE_MS = 20_000;

/* Routes the E2E run needs, not the product: a reset and a drain, registered
 * only under `NODE_ENV=test`, so the guard is registration itself. */
export function registerE2eRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  app.post('/__e2e__/reset', async (request, reply) => {
    audit(request.log, { action: 'instance_reset', outcome: 'allowed' });

    context.database.unitOfWork(() => {
      // Children first, because the foreign keys are enforced.
      context.database.db.delete(associations).run();
      context.database.db.delete(suppressions).run();
      context.database.db.delete(shares).run();
      context.database.db.delete(syncRuns).run();
      context.database.db.delete(playlists).run();
      context.database.db.delete(tracks).run();
      context.database.db.delete(accounts).run();
    });

    await rm(context.mediaPaths.mediaDir, { recursive: true, force: true });
    await rm(context.mediaPaths.thumbnailsDir, {
      recursive: true,
      force: true
    });
    await rm(context.mediaPaths.coversDir, { recursive: true, force: true });
    await ensureMediaDirectories(context.mediaPaths);

    return reply.code(204).send();
  });

  /* Drain the backlog: the interval would make a test wait on the clock. It
   * kicks and watches `pending`: a kick during a running pass is a no-op. */
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
