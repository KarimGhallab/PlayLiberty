import type { FastifyInstance } from 'fastify';

import { AddTrackInputSchema, ProblemCode } from '@playliberty/contracts';
import { YoutubeSourceKind } from '@playliberty/youtube';

import type { AppContext } from '../../../shared/context.js';
import { exhaust } from '../../../shared/exhaust.js';
import {
  parseBody,
  sendProblem,
  sendUnprocessable,
  sendValidationFailed
} from '../../../shared/problem.js';
import { resolveSourceUrl } from '../../../shared/resolveSourceUrl.js';

import { addTrackToPlaylists } from '../addTrackToPlaylists.js';
import {
  fetchTrackWholeForAccount,
  resolveTrackForStream,
  resolveTrackForThumbnail,
  retryTrackForAccount
} from '../service/trackService.js';
import {
  FetchWholeOutcome,
  RetryTrackOutcome,
  TrackStreamOutcome,
  TrackThumbnailOutcome
} from '../types.js';

/* Media is content-stable: browser-cacheable, but `private`, so no shared cache
 * may replay one account's media to another. Cache-Control seconds. */
const AUDIO_CACHE_CONTROL = 'private, max-age=604800';
const THUMBNAIL_CACHE_CONTROL = 'private, max-age=2592000';

export function registerTrackRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  app.post('/tracks', async (request, reply) => {
    const parsed = parseBody(AddTrackInputSchema, request.body);

    if (!parsed.success) {
      return sendValidationFailed(reply, parsed.issues, 422);
    }

    const info = resolveSourceUrl(parsed.data.url);

    // This route takes a video; a playlist URL refuses the whole request.
    if (info === null || info.kind !== YoutubeSourceKind.Video) {
      return sendUnprocessable(reply);
    }

    const result = await addTrackToPlaylists(
      context,
      request.account.id,
      info,
      parsed.data.playlistIds
    );

    return reply.send(result);
  });

  app.get<{ Params: { id: string } }>(
    '/tracks/:id/stream',
    async (request, reply) => {
      const result = resolveTrackForStream(
        context.database,
        request.params.id,
        request.account.id
      );

      if (result.outcome === TrackStreamOutcome.NotFound) {
        return sendProblem(reply, {
          status: 404,
          code: ProblemCode.TrackNotFound,
          title: 'Track Not Found'
        });
      }

      if (result.outcome === TrackStreamOutcome.Forbidden) {
        return sendProblem(reply, {
          status: 403,
          code: ProblemCode.Forbidden,
          title: 'Forbidden'
        });
      }

      if (result.outcome === TrackStreamOutcome.NotStored) {
        return sendProblem(reply, {
          status: 409,
          code: ProblemCode.TrackNotStored,
          title: 'Track Not Stored',
          detail: 'The track has no stored media to stream.'
        });
      }

      if (result.outcome === TrackStreamOutcome.Ok) {
        return reply
          .header('Cache-Control', AUDIO_CACHE_CONTROL)
          .type('audio/mp4')
          .sendFile(result.filePath, {
            contentType: false,
            cacheControl: false
          });
      }

      return exhaust(result);
    }
  );

  app.get<{ Params: { id: string } }>(
    '/tracks/:id/thumbnail',
    async (request, reply) => {
      const result = resolveTrackForThumbnail(
        context.database,
        request.params.id,
        request.account.id
      );

      if (result.outcome === TrackThumbnailOutcome.NotFound) {
        return sendProblem(reply, {
          status: 404,
          code: ProblemCode.ThumbnailNotFound,
          title: 'Thumbnail Not Found'
        });
      }

      if (result.outcome === TrackThumbnailOutcome.Forbidden) {
        return sendProblem(reply, {
          status: 403,
          code: ProblemCode.Forbidden,
          title: 'Forbidden'
        });
      }

      if (result.outcome === TrackThumbnailOutcome.Ok) {
        return reply
          .header('Cache-Control', THUMBNAIL_CACHE_CONTROL)
          .type('image/jpeg')
          .sendFile(result.thumbnailPath, {
            contentType: false,
            cacheControl: false
          });
      }

      return exhaust(result);
    }
  );

  app.post<{ Params: { id: string } }>(
    '/tracks/:id/retry',
    async (request, reply) => {
      const result = retryTrackForAccount(
        context,
        request.params.id,
        request.account.id
      );

      if (result.outcome === RetryTrackOutcome.NotFound) {
        return sendProblem(reply, {
          status: 404,
          code: ProblemCode.TrackNotFound,
          title: 'Track Not Found'
        });
      }

      if (result.outcome === RetryTrackOutcome.NotRetryable) {
        return sendProblem(reply, {
          status: 409,
          code: ProblemCode.TrackNotRetryable,
          title: 'Track Not Retryable',
          detail: 'Only a failed track can be retried.'
        });
      }

      if (result.outcome === RetryTrackOutcome.Ok) {
        return reply.send(result.track);
      }

      return exhaust(result);
    }
  );

  app.post<{ Params: { id: string } }>(
    '/tracks/:id/fetch-whole',
    async (request, reply) => {
      const result = fetchTrackWholeForAccount(
        context,
        request.params.id,
        request.account.id
      );

      if (result.outcome === FetchWholeOutcome.NotFound) {
        return sendProblem(reply, {
          status: 404,
          code: ProblemCode.TrackNotFound,
          title: 'Track Not Found'
        });
      }

      if (result.outcome === FetchWholeOutcome.NotEligible) {
        return sendProblem(reply, {
          status: 409,
          code: ProblemCode.TrackNotFetchable,
          title: 'Track Not Fetchable',
          detail:
            'Only a track that is waiting to be fetched can be fetched whole.'
        });
      }

      if (result.outcome === FetchWholeOutcome.Ok) {
        return reply.send(result.track);
      }

      return exhaust(result);
    }
  );
}
