import type { FastifyInstance } from 'fastify';

import {
  PlaylistNotFoundReason,
  ProblemCode,
  endpoints
} from '@playliberty/contracts';

import type { AppContext } from '../../../shared/context.js';
import { exhaust } from '../../../shared/exhaust.js';
import { sendPlaylistNotFound, sendProblem } from '../../../shared/problem.js';
import { registerEndpoint } from '../../../shared/registerEndpoint.js';

import { resolveLatestSyncRun } from '../syncRunService.js';
import { SyncRunOutcome } from '../types.js';

export function registerSyncRunRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.latestSyncRun,
    async (request, reply) => {
      const result = resolveLatestSyncRun(
        context.database,
        request.params.playlistId,
        request.account.id
      );

      if (result.outcome === SyncRunOutcome.PlaylistNotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Read);
      }

      // Same 404 as above; the code is what tells them apart. "no run" and a
      // "failed run" must stay distinguishable.
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
