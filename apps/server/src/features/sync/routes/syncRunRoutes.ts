import type { FastifyInstance } from 'fastify';

import { PlaylistNotFoundReason, ProblemCode } from '@playliberty/contracts';
import { exhaust } from '@playliberty/utils';

import type { AppContext } from '../../../shared/context.js';
import { sendPlaylistNotFound, sendProblem } from '../../../shared/problem.js';

import { resolveLatestSyncRun } from '../syncRunService.js';
import { SyncRunOutcome } from '../types.js';

export function registerSyncRunRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  app.get<{ Params: { id: string } }>(
    '/playlists/:id/sync-runs/latest',
    async (request, reply) => {
      const result = resolveLatestSyncRun(
        context.database,
        request.params.id,
        request.account.id
      );

      if (result.outcome === SyncRunOutcome.PlaylistNotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Read);
      }

      // A playlist that has never synced is not an error and this status is
      // shared with the case above, so the code is what separates them. The
      // design record depends on the difference: the empty state is a
      // lastSyncedAt of null with a run present as a reachable combination, so
      // "no run" and "a run that failed" have to be tellable apart by a client.
      if (result.outcome === SyncRunOutcome.RunAbsent) {
        return sendProblem(reply, {
          status: 404,
          code: ProblemCode.SyncRunAbsent,
          title: 'No Sync Run',
          detail: 'This playlist has never been synced.'
        });
      }

      if (result.outcome === SyncRunOutcome.Ok) {
        return reply.send(result.run);
      }

      return exhaust(result);
    }
  );
}
