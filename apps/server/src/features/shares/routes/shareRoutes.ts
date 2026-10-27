import type { FastifyInstance } from 'fastify';

import { SharePlaylistInputSchema, endpoints } from '@playliberty/contracts';

import { audit } from '../../../shared/audit.js';
import type { AppContext } from '../../../shared/context.js';
import { parseBody, sendValidationFailed } from '../../../shared/problem.js';
import { sendRefusal } from '../../../shared/refusal.js';
import { registerEndpoint } from '../../../shared/registerEndpoint.js';

import {
  grantShareForAccount,
  listSharesForAccount,
  revokeShareForAccount
} from '../shareService.js';

export function registerShareRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.playlistShares,
    async (request, reply) => {
      const result = listSharesForAccount(
        context.database,
        request.params.playlistId,
        request.account.id
      );

      if (result.outcome === 'refused') {
        return sendRefusal(reply, result.refusal);
      }

      return reply.send(result.shares);
    }
  );

  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.grantShare,
    async (request, reply) => {
      const parsed = parseBody(SharePlaylistInputSchema, request.body);

      if (!parsed.success) {
        return sendValidationFailed(reply, parsed.issues);
      }

      const result = grantShareForAccount(
        context,
        request.params.playlistId,
        request.account.id,
        parsed.data.accountId,
        parsed.data.level
      );

      if (result.outcome === 'refused') {
        return sendRefusal(reply, result.refusal);
      }

      audit(request.log, {
        action: 'share_granted',
        outcome: 'allowed',
        actor: request.account.id,
        playlist: request.params.playlistId,
        account: parsed.data.accountId,
        level: parsed.data.level
      });
      return reply.send(result.share);
    }
  );

  registerEndpoint<{ Params: { playlistId: string; accountId: string } }>(
    app,
    endpoints.revokeShare,
    async (request, reply) => {
      const result = revokeShareForAccount(
        context,
        request.params.playlistId,
        request.account.id,
        request.params.accountId
      );

      if (result.outcome === 'refused') {
        return sendRefusal(reply, result.refusal);
      }

      /* The revoked account is told the playlist is gone, so its screen reads
       * not-found; the remaining audience hears the change. */
      audit(request.log, {
        action: 'share_revoked',
        outcome: 'allowed',
        actor: request.account.id,
        playlist: request.params.playlistId,
        account: request.params.accountId
      });
      return reply.code(204).send();
    }
  );
}
