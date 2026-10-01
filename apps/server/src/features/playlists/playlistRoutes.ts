import type { FastifyInstance } from 'fastify';

import {
  AddTrackInputSchema,
  CreatePlaylistInputSchema,
  PageQuerySchema,
  RenamePlaylistInputSchema
} from '@playliberty/contracts';
import { exhaust } from '@playliberty/utils';

import type { AppContext } from '../../shared/context.js';
import {
  parseBody,
  sendInvalidRequest,
  sendNotImplemented,
  sendProblem
} from '../../shared/problem.js';

import {
  StartSyncOutcome,
  resolveSourceUrl,
  startSyncForPlaylist,
  startSyncForSource
} from '../sync/syncService.js';
import {
  PlaylistOutcome,
  listPlaylistsForAccount,
  readPlaylistForAccount
} from './playlistService.js';

export function registerPlaylistRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  app.get('/playlists', async (request, reply) => {
    const parsed = parseBody(PageQuerySchema, request.query);

    if (!parsed.success) {
      return sendInvalidRequest(reply, parsed.message);
    }

    return reply.send(
      listPlaylistsForAccount(context.database, request.account.id, {
        limit: parsed.data.limit,
        offset: parsed.data.offset
      })
    );
  });

  app.post('/playlists', async (request, reply) => {
    const parsed = parseBody(CreatePlaylistInputSchema, request.body);

    if (!parsed.success) {
      return sendInvalidRequest(reply, parsed.message);
    }

    const info = resolveSourceUrl(parsed.data.url);

    if (info === null) {
      return sendInvalidRequest(
        reply,
        'The URL is not a YouTube playlist or video URL.'
      );
    }

    // The playlist and its run exist before this answers, so the client has an id
    // to read the run from; the reconcile itself finishes behind the response.
    const started = startSyncForSource(context, request.account.id, info);

    if (started.outcome === StartSyncOutcome.AlreadyRunning) {
      return sendProblem(reply, {
        status: 409,
        code: 'sync_already_running',
        title: 'Sync Already Running',
        detail: 'A sync is already running for this playlist.'
      });
    }

    return reply.code(202).send(started.run);
  });

  app.get<{ Params: { id: string } }>(
    '/playlists/:id',
    async (request, reply) => {
      const result = readPlaylistForAccount(
        context.database,
        request.params.id,
        request.account.id
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendProblem(reply, {
          status: 404,
          code: 'playlist_not_found',
          title: 'Playlist Not Found',
          detail: 'The playlist does not exist, or this account cannot see it.'
        });
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send(result.playlist);
      }

      return exhaust(result);
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
    '/playlists/:id/sync',
    async (request, reply) => {
      const result = startSyncForPlaylist(
        context,
        request.params.id,
        request.account.id
      );

      if (result.outcome === StartSyncOutcome.PlaylistNotFound) {
        return sendProblem(reply, {
          status: 404,
          code: 'playlist_not_found',
          title: 'Playlist Not Found',
          detail:
            'The playlist does not exist, or this account cannot write it.'
        });
      }

      if (result.outcome === StartSyncOutcome.AlreadyRunning) {
        return sendProblem(reply, {
          status: 409,
          code: 'sync_already_running',
          title: 'Sync Already Running',
          detail: 'A sync is already running for this playlist.'
        });
      }

      return reply.code(202).send(result.run);
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
