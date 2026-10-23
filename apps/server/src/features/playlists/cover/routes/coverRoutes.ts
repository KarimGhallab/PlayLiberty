import type { FastifyInstance } from 'fastify';

import {
  PlaylistNotFoundReason,
  ProblemCode,
  endpoints
} from '@playliberty/contracts';

import type { AppContext } from '../../../../shared/context.js';
import { exhaust } from '../../../../shared/exhaust.js';
import {
  sendPlaylistNotFound,
  sendProblem,
  sendUnprocessable
} from '../../../../shared/problem.js';
import { registerEndpoint } from '../../../../shared/registerEndpoint.js';

import {
  readPlaylistCoverForAccount,
  removePlaylistCoverForAccount,
  setPlaylistCoverForAccount
} from '../coverService.js';
import { MAX_COVER_BYTES } from '../normalizeCoverImage.js';
import { InvalidCoverCropError, readCoverCrop } from '../readCoverCrop.js';
import type { CoverCrop } from '../types.js';
import { PlaylistCoverOutcome } from '../types.js';

/* The stored cover is content-stable because its URL carries the version. */
const COVER_CACHE_CONTROL = 'private, max-age=2592000';
const ACCEPTED_COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function isAcceptedCoverType(contentType: string | undefined): boolean {
  if (contentType === undefined) {
    return false;
  }

  const essence = contentType.split(';')[0]?.trim().toLowerCase();

  return essence !== undefined && ACCEPTED_COVER_TYPES.has(essence);
}

export function registerCoverRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  /* Only an image body takes the larger bound; the rest of the API keeps the
   * server's default. */
  app.addContentTypeParser(
    [...ACCEPTED_COVER_TYPES],
    { parseAs: 'buffer', bodyLimit: MAX_COVER_BYTES },
    (_request, body, done) => {
      done(null, body);
    }
  );

  registerEndpoint<{
    Params: { playlistId: string };
    Querystring: Record<string, unknown>;
  }>(app, endpoints.setPlaylistCover, async (request, reply) => {
    if (!isAcceptedCoverType(request.headers['content-type'])) {
      return sendProblem(reply, {
        status: 415,
        code: ProblemCode.RequestError,
        title: 'Unsupported Media Type',
        detail: 'A cover must be a JPEG, PNG or WebP image.'
      });
    }

    if (!Buffer.isBuffer(request.body)) {
      return sendUnprocessable(reply);
    }

    let crop: CoverCrop | null;

    try {
      crop = readCoverCrop(request.query);
    } catch (error) {
      if (error instanceof InvalidCoverCropError) {
        return sendUnprocessable(reply);
      }

      throw error;
    }

    const result = await setPlaylistCoverForAccount(
      context,
      request.params.playlistId,
      request.account.id,
      request.body,
      crop
    );

    if (result.outcome === PlaylistCoverOutcome.PlaylistNotFound) {
      return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Write);
    }

    if (result.outcome === PlaylistCoverOutcome.InvalidImage) {
      return sendUnprocessable(reply);
    }

    if (result.outcome === PlaylistCoverOutcome.Ok) {
      return reply.send(result.playlist);
    }

    return exhaust(result);
  });

  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.playlistCover,
    async (request, reply) => {
      const result = await readPlaylistCoverForAccount(
        context,
        request.params.playlistId,
        request.account.id
      );

      if (result.outcome === PlaylistCoverOutcome.PlaylistNotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Read);
      }

      if (result.outcome === PlaylistCoverOutcome.CoverNotFound) {
        return sendProblem(reply, {
          status: 404,
          code: ProblemCode.CoverNotFound,
          title: 'Cover Not Found'
        });
      }

      if (result.outcome === PlaylistCoverOutcome.Ok) {
        return reply
          .header('Cache-Control', COVER_CACHE_CONTROL)
          .type('image/webp')
          .sendFile(result.coverPath, {
            contentType: false,
            cacheControl: false
          });
      }

      return exhaust(result);
    }
  );

  registerEndpoint<{ Params: { playlistId: string } }>(
    app,
    endpoints.removePlaylistCover,
    async (request, reply) => {
      const result = await removePlaylistCoverForAccount(
        context,
        request.params.playlistId,
        request.account.id
      );

      if (result.outcome === PlaylistCoverOutcome.PlaylistNotFound) {
        return sendPlaylistNotFound(reply, PlaylistNotFoundReason.Write);
      }

      if (result.outcome === PlaylistCoverOutcome.Ok) {
        return reply.code(204).send();
      }

      return exhaust(result);
    }
  );
}
