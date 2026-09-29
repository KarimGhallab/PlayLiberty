import type { FastifyInstance } from 'fastify';

import { SharePlaylistInputSchema } from '@playliberty/contracts';

import {
  parseBody,
  sendInvalidRequest,
  sendNotImplemented
} from '../../shared/problem.js';

export function registerShareRoutes(app: FastifyInstance): void {
  app.get<{ Params: { id: string } }>(
    '/playlists/:id/shares',
    async (_request, reply) => {
      return sendNotImplemented(
        reply,
        'Listing shares is not implemented yet.'
      );
    }
  );

  app.post<{ Params: { id: string } }>(
    '/playlists/:id/shares',
    async (request, reply) => {
      const parsed = parseBody(SharePlaylistInputSchema, request.body);

      if (!parsed.success) {
        return sendInvalidRequest(reply, parsed.message);
      }

      return sendNotImplemented(
        reply,
        'Sharing a playlist is not implemented yet.'
      );
    }
  );

  app.delete<{ Params: { id: string; accountId: string } }>(
    '/playlists/:id/shares/:accountId',
    async (_request, reply) => {
      return sendNotImplemented(
        reply,
        'Revoking a share is not implemented yet.'
      );
    }
  );
}
