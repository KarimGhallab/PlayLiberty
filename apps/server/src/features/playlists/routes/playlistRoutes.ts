import type { FastifyInstance } from 'fastify';

import {
  CreatePlaylistInputSchema,
  PageQuerySchema,
  PinPlaylistInputSchema,
  PlaylistTracksQuerySchema,
  RenamePlaylistInputSchema,
  SkipNonMusicInputSchema,
  SortPlaylistInputSchema,
  endpoints
} from '@playliberty/contracts';

import { audit } from '../../../shared/audit.js';
import type { AppContext } from '../../../shared/context.js';
import { exhaust } from '../../../shared/exhaust.js';
import {
  parseBody,
  sendInvalidRequest,
  sendValidationFailed
} from '../../../shared/problem.js';
import { sendRefusal } from '../../../shared/refusal.js';
import { registerEndpoint } from '../../../shared/registerEndpoint.js';
import { resolveSourceUrl } from '../../../shared/resolveSourceUrl.js';

import {
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
  registerEndpoint(app, endpoints.playlists, async (request, reply) => {
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

  registerEndpoint(app, endpoints.createPlaylist, async (request, reply) => {
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

    if (started.outcome === 'refused') {
      return sendRefusal(reply, started.refusal);
    }

    return reply.code(202).send(started.run);
  });

  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.playlist,
    async (request, reply) => {
      const result = readPlaylistForAccount(
        context.database,
        request.params.playlistId,
        request.account.id
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send(result.playlist);
      }

      return exhaust(result);
    }
  );

  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.playlistTracks,
    async (request, reply) => {
      const parsed = parseBody(PlaylistTracksQuerySchema, request.query);

      if (!parsed.success) {
        return sendValidationFailed(reply, parsed.issues);
      }

      const result = listPlaylistTracksForAccount(
        context.database,
        request.params.playlistId,
        request.account.id,
        {
          limit: parsed.data.limit,
          offset: parsed.data.offset,
          state: parsed.data.state
        }
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send(result.page);
      }

      return exhaust(result);
    }
  );

  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.playlistQueue,
    async (request, reply) => {
      const result = listPlaylistQueueForAccount(
        context.database,
        request.params.playlistId,
        request.account.id
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send({ items: result.items });
      }

      return exhaust(result);
    }
  );

  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.renamePlaylist,
    async (request, reply) => {
      const parsed = parseBody(RenamePlaylistInputSchema, request.body);

      if (!parsed.success) {
        return sendValidationFailed(reply, parsed.issues);
      }

      const result = renamePlaylistForAccount(
        context,
        request.params.playlistId,
        request.account.id,
        parsed.data.name
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send(result.playlist);
      }

      return exhaust(result);
    }
  );

  /* The owner and write collaborator may change the skip-non-music setting, not
   * retroactive: it sets the default for tracks created from now on. */
  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.skipNonMusic,
    async (request, reply) => {
      const parsed = parseBody(SkipNonMusicInputSchema, request.body);

      if (!parsed.success) {
        return sendValidationFailed(reply, parsed.issues);
      }

      const result = updateSkipNonMusicForAccount(
        context,
        request.params.playlistId,
        request.account.id,
        parsed.data.skipNonMusic
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send(result.playlist);
      }

      return exhaust(result);
    }
  );

  /* Owner and write collaborator may change the track order. The playlist's own
   * order is the absence, so clearing the sort writes no value. */
  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.sortPlaylist,
    async (request, reply) => {
      const parsed = parseBody(SortPlaylistInputSchema, request.body);

      if (!parsed.success) {
        return sendValidationFailed(reply, parsed.issues);
      }

      const result = updateSortForAccount(
        context,
        request.params.playlistId,
        request.account.id,
        parsed.data.sort
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send(result.playlist);
      }

      return exhaust(result);
    }
  );

  /* Check is the read need, not write: a pin is the account's own placement,
   * so a read collaborator may pin. No event: not a playlist change. */
  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.pinPlaylist,
    async (request, reply) => {
      const parsed = parseBody(PinPlaylistInputSchema, request.body);

      if (!parsed.success) {
        return sendValidationFailed(reply, parsed.issues);
      }

      const result = updatePinForAccount(
        context.database,
        request.params.playlistId,
        request.account.id,
        parsed.data.pinned
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.send(result.playlist);
      }

      return exhaust(result);
    }
  );

  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.deletePlaylist,
    async (request, reply) => {
      const result = deletePlaylistForAccount(
        context,
        request.params.playlistId,
        request.account.id
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        audit(request.log, {
          action: 'playlist_deleted',
          outcome: 'allowed',
          actor: request.account.id,
          playlist: request.params.playlistId
        });
        return reply.code(204).send();
      }

      return exhaust(result);
    }
  );

  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.syncPlaylist,
    async (request, reply) => {
      const result = startSyncForPlaylist(
        context,
        request.params.playlistId,
        request.account.id
      );

      if (result.outcome === 'refused') {
        return sendRefusal(reply, result.refusal);
      }

      return reply.code(202).send(result.run);
    }
  );

  registerEndpoint<{ Params: { playlistId: string; trackId: string } }>(
    app,
    endpoints.removeTrack,
    async (request, reply) => {
      const result = removeTrackForAccount(
        context,
        request.params.playlistId,
        request.params.trackId,
        request.account.id
      );

      if (result.outcome === PlaylistOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === PlaylistOutcome.Ok) {
        return reply.code(204).send();
      }

      return exhaust(result);
    }
  );
}
