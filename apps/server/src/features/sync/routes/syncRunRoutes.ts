import type { FastifyInstance } from 'fastify';

import { endpoints } from '@playliberty/contracts';

import type { AppContext } from '../../../shared/context.js';
import { sendRefusal } from '../../../shared/refusal.js';
import { registerEndpoint } from '../../../shared/registerEndpoint.js';

import { resolveLatestSyncRun } from '../syncRunService.js';

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

      // Both a vanished playlist and a playlist with no run answer 404; the
      // code is what tells them apart.
      if (result.outcome === 'refused') {
        return sendRefusal(reply, result.refusal);
      }

      return reply.send(result.run);
    }
  );
}
