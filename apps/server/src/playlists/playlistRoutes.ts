import type { FastifyInstance } from 'fastify';

import {
  AddTrackInputSchema,
  CreatePlaylistInputSchema,
  RenamePlaylistInputSchema
} from '@playliberty/contracts';

import { sendNotImplemented } from '../errors/problem.js';
import { parseBody, sendInvalidRequest } from '../http/validation.js';

export function registerPlaylistRoutes(app: FastifyInstance): void {
  app.get('/playlists', async (_request, reply) => {
    return sendNotImplemented(
      reply,
      'Listing playlists is not implemented yet.'
    );
  });

  app.post('/playlists', async (request, reply) => {
    const parsed = parseBody(CreatePlaylistInputSchema, request.body);

    if (!parsed.success) {
      return sendInvalidRequest(reply, parsed.message);
    }

    return sendNotImplemented(
      reply,
      'Creating a synced playlist is not implemented yet.'
    );
  });

  app.get<{ Params: { id: string } }>(
    '/playlists/:id',
    async (_request, reply) => {
      return sendNotImplemented(
        reply,
        'Reading a playlist is not implemented yet.'
      );
    }
  );

  app.patch<{ Params: { id: string } }>(
    '/playlists/:id',
    async (request, reply) => {
      const parsed = parseBody(RenamePlaylistInputSchema, request.body);

      if (!parsed.success) {
        return sendInvalidRequest(reply, parsed.message);
      }

      return sendNotImplemented(
        reply,
        'Renaming a playlist is not implemented yet.'
      );
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/playlists/:id',
    async (_request, reply) => {
      return sendNotImplemented(
        reply,
        'Deleting a playlist is not implemented yet.'
      );
    }
  );

  app.post<{ Params: { id: string } }>(
    '/playlists/:id/refresh',
    async (_request, reply) => {
      return sendNotImplemented(
        reply,
        'Refreshing a playlist is not implemented yet.'
      );
    }
  );

  app.post<{ Params: { id: string } }>(
    '/playlists/:id/tracks',
    async (request, reply) => {
      const parsed = parseBody(AddTrackInputSchema, request.body);

      if (!parsed.success) {
        return sendInvalidRequest(reply, parsed.message);
      }

      return sendNotImplemented(
        reply,
        'Adding a track is not implemented yet.'
      );
    }
  );

  app.delete<{ Params: { id: string; trackId: string } }>(
    '/playlists/:id/tracks/:trackId',
    async (_request, reply) => {
      return sendNotImplemented(
        reply,
        'Removing a track is not implemented yet.'
      );
    }
  );
}
