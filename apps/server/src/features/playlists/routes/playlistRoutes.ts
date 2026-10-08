import type { FastifyInstance } from 'fastify';

import {
  CreatePlaylistInputSchema,
  PageQuerySchema,
  RenamePlaylistInputSchema,
  SkipNonMusicInputSchema
} from '@playliberty/contracts';
import { exhaust } from '@playliberty/utils';

import { playlistAudience } from '../../../shared/access/playlistAccess.js';
import type { AppContext } from '../../../shared/context.js';
import {
  publishPlaylistChanged,
  publishPlaylistRemoved,
  publishTracksChangedForPlaylists
} from '../../../shared/events/liveEvents.js';
import {
  parseBody,
  sendInvalidRequest,
  sendProblem,
  sendValidationFailed
} from '../../../shared/problem.js';
import { resolveSourceUrl } from '../../../shared/resolveSourceUrl.js';

import {
  StartSyncOutcome,
  startSyncForPlaylist,
  startSyncForSource
} from '../../sync/services/syncService.js';
import {
  PlaylistOutcome,
  deletePlaylistForAccount,
  listPlaylistTracksForAccount,
  listPlaylistsForAccount,
  readPlaylistForAccount,
  removeTrackForAccount,
  renamePlaylistForAccount,
  updateSkipNonMusicForAccount
} from '../playlistService.js';

export function registerPlaylistRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  app.get('/playlists', async (request, reply) => {
    const parsed = parseBody(PageQuerySchema, request.query);

    if (!parsed.success) {
      return sendValidationFailed(reply, parsed.issues);
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
      return sendValidationFailed(reply, parsed.issues);
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
          detail: 'The playlist does not exist, or this account cannot see it.',
          params: { reason: 'read' }
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
        return sendValidationFailed(reply, parsed.issues);
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
          detail: 'The playlist does not exist, or this account cannot see it.',
          params: { reason: 'read' }
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
        return sendValidationFailed(reply, parsed.issues);
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
            'The playlist does not exist, or this account cannot manage it.',
          params: { reason: 'manage' }
        });
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        publishPlaylistChanged(context, request.params.id);
        return reply.send(result.playlist);
      }

      return exhaust(result);
    }
  );

  /*
   * The skip-non-music setting, which the owner and a write collaborator may
   * change. The write is not retroactive: it sets the default for tracks created
   * from now on, and every track already created keeps the value it was born
   * with. A read collaborator, a stranger and a missing playlist are one
   * not-found.
   */
  app.patch<{ Params: { id: string } }>(
    '/playlists/:id/skip-non-music',
    async (request, reply) => {
      const parsed = parseBody(SkipNonMusicInputSchema, request.body);

      if (!parsed.success) {
        return sendValidationFailed(reply, parsed.issues);
      }

      const result = updateSkipNonMusicForAccount(
        context.database,
        request.params.id,
        request.account.id,
        parsed.data.skipNonMusic
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendProblem(reply, {
          status: 404,
          code: 'playlist_not_found',
          title: 'Playlist Not Found',
          detail:
            'The playlist does not exist, or this account cannot write it.',
          params: { reason: 'write' }
        });
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        publishPlaylistChanged(context, request.params.id);
        return reply.send(result.playlist);
      }

      return exhaust(result);
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/playlists/:id',
    async (request, reply) => {
      const audience = playlistAudience(context.database, request.params.id);
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
            'The playlist does not exist, or this account cannot manage it.',
          params: { reason: 'manage' }
        });
      }

      if (outcome === PlaylistOutcome.Ok) {
        publishPlaylistRemoved(context, request.params.id, audience);
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
            'The playlist does not exist, or this account cannot write it.',
          params: { reason: 'write' }
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
            'The playlist does not exist, this account cannot write it, or the track is not in it.',
          params: { reason: 'track' }
        });
      }

      if (outcome === PlaylistOutcome.Ok) {
        publishTracksChangedForPlaylists(context, [request.params.id]);
        return reply.code(204).send();
      }

      return exhaust(outcome);
    }
  );
}
