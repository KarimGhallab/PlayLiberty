import type { FastifyInstance } from 'fastify';

import {
  CreatePlaylistInputSchema,
  PageQuerySchema,
  PinPlaylistInputSchema,
  PlaylistNotFoundReason,
  PlaylistTracksQuerySchema,
  ProblemCode,
  RenamePlaylistInputSchema,
  SkipNonMusicInputSchema,
  SortPlaylistInputSchema
} from '@playliberty/contracts';

import { audit } from '../../../shared/audit.js';
import type { AppContext } from '../../../shared/context.js';
import { exhaust } from '../../../shared/exhaust.js';
import {
  parseBody,
  sendInvalidRequest,
  sendPlaylistNotFound,
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
  listPlaylistQueueForAccount,
  listPlaylistTracksForAccount,
  listPlaylistsForAccount,
  readPlaylistForAccount,
  removeTrackForAccount,
  renamePlaylistForAccount,
  updatePinForAccount,
  updateSkipNonMusicForAccount,
  updateSortForAccount
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
      return sendInvalidRequest(reply);
    }

    // The playlist and run exist before this answers, giving the client an id
    // to read the run from; the reconcile finishes behind the response.
    const started = startSyncForSource(
      context,
      request.account.id,
      info,
      parsed.data.skipNonMusic
    );

    if (started.outcome === StartSyncOutcome.AlreadyRunning) {
      return sendProblem(reply, {
        status: 409,
        code: ProblemCode.SyncAlreadyRunning,
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
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Read);
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
      const parsed = parseBody(PlaylistTracksQuerySchema, request.query);

      if (!parsed.success) {
        return sendValidationFailed(reply, parsed.issues);
      }

      const result = listPlaylistTracksForAccount(
        context.database,
        request.params.id,
        request.account.id,
        {
          limit: parsed.data.limit,
          offset: parsed.data.offset,
          state: parsed.data.state
        }
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Read);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send(result.page);
      }

      return exhaust(result);
    }
  );

  app.get<{ Params: { id: string } }>(
    '/playlists/:id/queue',
    async (request, reply) => {
      const result = listPlaylistQueueForAccount(
        context.database,
        request.params.id,
        request.account.id
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Read);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send({ items: result.items });
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
        context,
        request.params.id,
        request.account.id,
        parsed.data.name
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Manage);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send(result.playlist);
      }

      return exhaust(result);
    }
  );

  /* The owner and write collaborator may change the skip-non-music setting, not
   * retroactive: it sets the default for tracks created from now on. */
  app.patch<{ Params: { id: string } }>(
    '/playlists/:id/skip-non-music',
    async (request, reply) => {
      const parsed = parseBody(SkipNonMusicInputSchema, request.body);

      if (!parsed.success) {
        return sendValidationFailed(reply, parsed.issues);
      }

      const result = updateSkipNonMusicForAccount(
        context,
        request.params.id,
        request.account.id,
        parsed.data.skipNonMusic
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Write);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send(result.playlist);
      }

      return exhaust(result);
    }
  );

  /* Owner and write collaborator may change the track order. The playlist's own
   * order is the absence, so clearing the sort writes no value. */
  app.patch<{ Params: { id: string } }>(
    '/playlists/:id/sort',
    async (request, reply) => {
      const parsed = parseBody(SortPlaylistInputSchema, request.body);

      if (!parsed.success) {
        return sendValidationFailed(reply, parsed.issues);
      }

      const result = updateSortForAccount(
        context,
        request.params.id,
        request.account.id,
        parsed.data.sort
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Write);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send(result.playlist);
      }

      return exhaust(result);
    }
  );

  /* Check is the read need, not write: a pin is the account's own placement,
   * so a read collaborator may pin. No event: not a playlist change. */
  app.patch<{ Params: { id: string } }>(
    '/playlists/:id/pin',
    async (request, reply) => {
      const parsed = parseBody(PinPlaylistInputSchema, request.body);

      if (!parsed.success) {
        return sendValidationFailed(reply, parsed.issues);
      }

      const result = updatePinForAccount(
        context.database,
        request.params.id,
        request.account.id,
        parsed.data.pinned
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Read);
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
        context,
        request.params.id,
        request.account.id
      );

      if (outcome === PlaylistOutcome.NotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Manage);
      }

      if (outcome === PlaylistOutcome.Ok) {
        audit(request.log, {
          action: 'playlist_deleted',
          outcome: 'allowed',
          actor: request.account.id,
          playlist: request.params.id
        });
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
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Write);
      }

      if (result.outcome === StartSyncOutcome.AlreadyRunning) {
        return sendProblem(reply, {
          status: 409,
          code: ProblemCode.SyncAlreadyRunning,
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
        context,
        request.params.id,
        request.params.trackId,
        request.account.id
      );

      if (outcome === PlaylistOutcome.NotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Track);
      }

      if (outcome === PlaylistOutcome.Ok) {
        return reply.code(204).send();
      }

      return exhaust(outcome);
    }
  );
}
