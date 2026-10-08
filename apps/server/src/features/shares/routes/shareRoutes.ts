import type { FastifyInstance } from 'fastify';

import {
  PlaylistNotFoundReason,
  ProblemCode,
  SharePlaylistInputSchema
} from '@playliberty/contracts';
import { exhaust } from '@playliberty/utils';

import { audit } from '../../../shared/audit.js';
import type { AppContext } from '../../../shared/context.js';
import {
  publishPlaylistChanged,
  publishPlaylistRemoved
} from '../../../shared/events/liveEvents.js';
import {
  parseBody,
  sendPlaylistNotFound,
  sendProblem,
  sendValidationFailed
} from '../../../shared/problem.js';

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
  app.get<{ Params: { id: string } }>(
    '/playlists/:id/shares',
    async (request, reply) => {
      const shares = listSharesForAccount(
        context.database,
        request.params.id,
        request.account.id
      );

      if (shares === null) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Manage);
      }

      return reply.send(shares);
    }
  );

  app.post<{ Params: { id: string } }>(
    '/playlists/:id/shares',
    async (request, reply) => {
      const parsed = parseBody(SharePlaylistInputSchema, request.body);

      if (!parsed.success) {
        return sendValidationFailed(reply, parsed.issues);
      }

      const result = grantShareForAccount(
        context.database,
        request.params.id,
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
          playlist: request.params.id,
          account: parsed.data.accountId,
          level: parsed.data.level
        });
        publishPlaylistChanged(context, request.params.id);
        return reply.send(result.share);
      }

      return exhaust(result);
    }
  );

  app.delete<{ Params: { id: string; accountId: string } }>(
    '/playlists/:id/shares/:accountId',
    async (request, reply) => {
      const outcome = revokeShareForAccount(
        context.database,
        request.params.id,
        request.account.id,
        request.params.accountId
      );

      if (outcome === ShareRevokeOutcome.PlaylistNotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Manage);
      }

      /*
       * The revoked account is told the playlist is gone, so a screen open on it
       * reads as not-found rather than as a fault; the owner and the accounts
       * that remain hear the change, which is the audience read after the delete.
       */
      audit(request.log, {
        action: 'share_revoked',
        outcome: 'allowed',
        actor: request.account.id,
        playlist: request.params.id,
        account: request.params.accountId
      });
      publishPlaylistRemoved(context, request.params.id, [
        request.params.accountId
      ]);
      publishPlaylistChanged(context, request.params.id);

      return reply.code(204).send();
    }
  );
}
