import type { FastifyInstance } from 'fastify';

import { AddTrackInputSchema, endpoints } from '@playliberty/contracts';
import { YoutubeSourceKind } from '@playliberty/youtube';

import type { AppContext } from '../../../shared/context.js';
import { exhaust } from '../../../shared/exhaust.js';
import {
  parseBody,
  sendUnprocessable,
  sendValidationFailed
} from '../../../shared/problem.js';
import { Refusal, sendRefusal } from '../../../shared/refusal.js';
import { registerEndpoint } from '../../../shared/registerEndpoint.js';
import { resolveSourceUrl } from '../../../shared/resolveSourceUrl.js';

import { addTrackToPlaylists } from '../addTrackToPlaylists.js';
import {
  fetchTrackWholeForAccount,
  resolveTrack,
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
  registerEndpoint(app, endpoints.addTrack, async (request, reply) => {
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

  registerEndpoint<{ Params: { trackId: string } }>(
    app,
    endpoints.track,
    async (request, reply) => {
      const track = resolveTrack(context.database, request.params.trackId);

      if (track === undefined) {
        return sendRefusal(reply, Refusal.TrackNotFound);
      }

      return reply.send(track);
    }
  );

  registerEndpoint<{ Params: { trackId: string } }>(
    app,
    endpoints.trackStream,
    async (request, reply) => {
      const result = resolveTrackForStream(
        context.database,
        request.params.trackId
      );

      if (result.outcome === TrackStreamOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === TrackStreamOutcome.NotStored) {
        return sendRefusal(reply, result.refusal);
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

  registerEndpoint<{ Params: { trackId: string } }>(
    app,
    endpoints.trackThumbnail,
    async (request, reply) => {
      const result = resolveTrackForThumbnail(
        context.database,
        request.params.trackId
      );

      if (result.outcome === TrackThumbnailOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
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

  registerEndpoint<{ Params: { trackId: string } }>(
    app,
    endpoints.retryTrack,
    async (request, reply) => {
      const result = retryTrackForAccount(
        context,
        request.params.trackId,
        request.account.id
      );

      if (result.outcome === RetryTrackOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === RetryTrackOutcome.NotRetryable) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === RetryTrackOutcome.Ok) {
        return reply.send(result.track);
      }

      return exhaust(result);
    }
  );

  registerEndpoint<{ Params: { trackId: string } }>(
    app,
    endpoints.fetchTrackWhole,
    async (request, reply) => {
      const result = fetchTrackWholeForAccount(
        context,
        request.params.trackId,
        request.account.id
      );

      if (result.outcome === FetchWholeOutcome.NotFound) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === FetchWholeOutcome.NotEligible) {
        return sendRefusal(reply, result.refusal);
      }

      if (result.outcome === FetchWholeOutcome.Ok) {
        return reply.send(result.track);
      }

      return exhaust(result);
    }
  );
}
