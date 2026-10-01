import type { FastifyInstance } from 'fastify';

import { SharePlaylistInputSchema } from '@playliberty/contracts';
import { exhaust } from '@playliberty/utils';

import type { AppContext } from '../../shared/context.js';
import {
  parseBody,
  sendInvalidRequest,
  sendProblem
} from '../../shared/problem.js';

import {
  GrantShareOutcome,
  ShareRevokeOutcome,
  grantShareForAccount,
  listSharesForAccount,
  revokeShareForAccount
} from './shareService.js';

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
        return sendProblem(reply, {
          status: 404,
          code: 'playlist_not_found',
          title: 'Playlist Not Found',
          detail:
            'The playlist does not exist, or this account cannot manage it.'
        });
      }

      return reply.send(shares);
    }
  );

  app.post<{ Params: { id: string } }>(
    '/playlists/:id/shares',
    async (request, reply) => {
      const parsed = parseBody(SharePlaylistInputSchema, request.body);

      if (!parsed.success) {
        return sendInvalidRequest(reply, parsed.message);
      }

      const result = grantShareForAccount(
        context.database,
        request.params.id,
        request.account.id,
        parsed.data.accountId,
        parsed.data.level
      );

      if (result.outcome === GrantShareOutcome.PlaylistNotFound) {
        return sendProblem(reply, {
          status: 404,
          code: 'playlist_not_found',
          title: 'Playlist Not Found',
          detail:
            'The playlist does not exist, or this account cannot manage it.'
        });
      }

      if (result.outcome === GrantShareOutcome.TargetNotFound) {
        return sendProblem(reply, {
          status: 404,
          code: 'account_not_found',
          title: 'Account Not Found',
          detail: 'The account this share names does not exist.'
        });
      }

      if (result.outcome === GrantShareOutcome.SelfShare) {
        return sendProblem(reply, {
          status: 422,
          code: 'self_share',
          title: 'Cannot Share With Yourself',
          detail: 'The playlist already belongs to this account.'
        });
      }

      if (result.outcome === GrantShareOutcome.Ok) {
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
        return sendProblem(reply, {
          status: 404,
          code: 'playlist_not_found',
          title: 'Playlist Not Found',
          detail:
            'The playlist does not exist, or this account cannot manage it.'
        });
      }

      return reply.code(204).send();
    }
  );
}
