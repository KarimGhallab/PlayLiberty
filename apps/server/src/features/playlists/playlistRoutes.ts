import type { FastifyInstance } from 'fastify';

import {
  CreatePlaylistInputSchema,
  PageQuerySchema,
  RenamePlaylistInputSchema
} from '@playliberty/contracts';
import { exhaust } from '@playliberty/utils';

import type { AppContext } from '../../shared/context.js';
import {
  parseBody,
  sendInvalidRequest,
  sendProblem
} from '../../shared/problem.js';
import { resolveSourceUrl } from '../../shared/resolveSourceUrl.js';

import {
  StartSyncOutcome,
  startSyncForPlaylist,
  startSyncForSource
} from '../sync/syncService.js';
import {
  PlaylistOutcome,
  deletePlaylistForAccount,
  listPlaylistTracksForAccount,
  listPlaylistsForAccount,
  readPlaylistForAccount,
  removeTrackForAccount,
  renamePlaylistForAccount
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
        'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
      );
    }

    // The playlist and its run exist before this answers, so the client has an id
    // to read the run from; the reconcile itself finishes behind the response.
    const started = startSyncForSource(
      context,
      request.account.id,
      info,
      parsed.data.skipNonMusic
    );

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

  app.get<{ Params: { id: string } }>(
    '/playlists/:id/tracks',
    async (request, reply) => {
      const parsed = parseBody(PageQuerySchema, request.query);

      if (!parsed.success) {
        return sendInvalidRequest(reply, parsed.message);
      }

      const result = listPlaylistTracksForAccount(
        context.database,
        request.params.id,
        request.account.id,
        { limit: parsed.data.limit, offset: parsed.data.offset }
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
        return reply.send(result.page);
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

      const result = renamePlaylistForAccount(
        context.database,
        request.params.id,
        request.account.id,
        parsed.data.name
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendProblem(reply, {
          status: 404,
          code: 'playlist_not_found',
          title: 'Playlist Not Found',
          detail:
            'The playlist does not exist, or this account cannot manage it.'
        });
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send(result.playlist);
      }

      return exhaust(result);
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/playlists/:id',
    async (request, reply) => {
      const outcome = deletePlaylistForAccount(
        context.database,
        request.params.id,
        request.account.id
      );

      if (outcome === PlaylistOutcome.NotFound) {
        return sendProblem(reply, {
          status: 404,
          code: 'playlist_not_found',
          title: 'Playlist Not Found',
          detail:
            'The playlist does not exist, or this account cannot manage it.'
        });
      }

      if (outcome === PlaylistOutcome.Ok) {
        return reply.code(204).send();
      }

      return exhaust(outcome);
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

  app.delete<{ Params: { id: string; trackId: string } }>(
    '/playlists/:id/tracks/:trackId',
    async (request, reply) => {
      const outcome = removeTrackForAccount(
        context.database,
        request.params.id,
        request.params.trackId,
        request.account.id
      );

      if (outcome === PlaylistOutcome.NotFound) {
        return sendProblem(reply, {
          status: 404,
          code: 'playlist_not_found',
          title: 'Playlist Not Found',
          detail:
            'The playlist does not exist, this account cannot write it, or the track is not in it.'
        });
      }

      if (outcome === PlaylistOutcome.Ok) {
        return reply.code(204).send();
      }

      return exhaust(outcome);
    }
  );
}
