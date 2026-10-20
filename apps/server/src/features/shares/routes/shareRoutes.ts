import type { FastifyInstance } from 'fastify';

import {
  PlaylistNotFoundReason,
  ProblemCode,
  SharePlaylistInputSchema,
  endpoints
} from '@playliberty/contracts';

import { audit } from '../../../shared/audit.js';
import type { AppContext } from '../../../shared/context.js';
import { exhaust } from '../../../shared/exhaust.js';
import {
  parseBody,
  sendPlaylistNotFound,
  sendProblem,
  sendValidationFailed
} from '../../../shared/problem.js';
import { registerEndpoint } from '../../../shared/registerEndpoint.js';

import {
  GrantShareOutcome,
  ShareRevokeOutcome,
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
      const shares = listSharesForAccount(
        context.database,
        request.params.playlistId,
        request.account.id
      );

      if (shares === null) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Manage);
      }

      return reply.send(shares);
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

      if (result.outcome === GrantShareOutcome.PlaylistNotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Manage);
      }

      if (result.outcome === GrantShareOutcome.TargetNotFound) {
        return sendProblem(reply, {
          status: 404,
          code: ProblemCode.AccountNotFound,
          title: 'Account Not Found',
          detail: 'The account this share names does not exist.'
        });
      }

      if (result.outcome === GrantShareOutcome.SelfShare) {
        return sendProblem(reply, {
          status: 422,
          code: ProblemCode.SelfShare,
          title: 'Cannot Share With Yourself',
          detail: 'The playlist already belongs to this account.'
        });
      }

      if (result.outcome === GrantShareOutcome.Ok) {
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

      return exhaust(result);
    }
  );

  registerEndpoint<{ Params: { playlistId: string; accountId: string } }>(
    app,
    endpoints.revokeShare,
    async (request, reply) => {
      const outcome = revokeShareForAccount(
        context,
        request.params.playlistId,
        request.account.id,
        request.params.accountId
      );

      if (outcome === ShareRevokeOutcome.PlaylistNotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Manage);
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
