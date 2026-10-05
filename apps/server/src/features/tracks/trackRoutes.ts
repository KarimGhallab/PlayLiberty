import type { FastifyInstance } from 'fastify';

import { AddTrackInputSchema } from '@playliberty/contracts';
import { exhaust } from '@playliberty/utils';
import { YoutubeSourceKind } from '@playliberty/youtube';

import type { AppContext } from '../../shared/context.js';
import {
  parseBody,
  sendProblem,
  sendUnprocessable
} from '../../shared/problem.js';
import { resolveSourceUrl } from '../../shared/resolveSourceUrl.js';

import { addTrackToPlaylists } from './addTrackToPlaylists.js';
import {
  fetchTrackWholeForAccount,
  resolveTrackForStream,
  resolveTrackForThumbnail,
  retryTrackForAccount
} from './trackService.js';
import {
  FetchWholeOutcome,
  RetryTrackOutcome,
  TrackStreamOutcome,
  TrackThumbnailOutcome
} from './types.js';

export function registerTrackRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  app.post('/tracks', async (request, reply) => {
    const parsed = parseBody(AddTrackInputSchema, request.body);

    if (!parsed.success) {
      return sendUnprocessable(reply, parsed.message);
    }

    const info = resolveSourceUrl(parsed.data.url);

    // A playlist URL is what the create-a-playlist dialog takes, and this dialog
    // takes a video; the whole request is refused so no playlist is touched.
    if (info === null || info.kind !== YoutubeSourceKind.Video) {
      return sendUnprocessable(reply, 'The URL is not a YouTube video URL.');
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
          code: 'track_not_found',
          title: 'Track Not Found'
        });
      }

      if (result.outcome === TrackStreamOutcome.Forbidden) {
        return sendProblem(reply, {
          status: 403,
          code: 'forbidden',
          title: 'Forbidden'
        });
      }

      if (result.outcome === TrackStreamOutcome.NotStored) {
        return sendProblem(reply, {
          status: 409,
          code: 'track_not_stored',
          title: 'Track Not Stored',
          detail: 'The track has no stored media to stream.'
        });
      }

      if (result.outcome === TrackStreamOutcome.Ok) {
        return reply.type('audio/mp4').sendFile(result.filePath, {
          contentType: false,
          maxAge: 0,
          immutable: false
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
          code: 'thumbnail_not_found',
          title: 'Thumbnail Not Found'
        });
      }

      if (result.outcome === TrackThumbnailOutcome.Forbidden) {
        return sendProblem(reply, {
          status: 403,
          code: 'forbidden',
          title: 'Forbidden'
        });
      }

      if (result.outcome === TrackThumbnailOutcome.Ok) {
        return reply.type('image/jpeg').sendFile(result.thumbnailPath, {
          contentType: false,
          maxAge: 86400,
          immutable: true
        });
      }

      return exhaust(result);
    }
  );

  app.post<{ Params: { id: string } }>(
    '/tracks/:id/retry',
    async (request, reply) => {
      const result = retryTrackForAccount(
        context.database,
        request.params.id,
        request.account.id
      );

      if (result.outcome === RetryTrackOutcome.NotFound) {
        return sendProblem(reply, {
          status: 404,
          code: 'track_not_found',
          title: 'Track Not Found'
        });
      }

      if (result.outcome === RetryTrackOutcome.NotRetryable) {
        return sendProblem(reply, {
          status: 409,
          code: 'track_not_retryable',
          title: 'Track Not Retryable',
          detail: 'Only a failed track can be retried.'
        });
      }

      if (result.outcome === RetryTrackOutcome.Ok) {
        context.kickDownloads();
        return reply.send(result.track);
      }

      return exhaust(result);
    }
  );

  app.post<{ Params: { id: string } }>(
    '/tracks/:id/fetch-whole',
    async (request, reply) => {
      const result = fetchTrackWholeForAccount(
        context.database,
        request.params.id,
        request.account.id
      );

      if (result.outcome === FetchWholeOutcome.NotFound) {
        return sendProblem(reply, {
          status: 404,
          code: 'track_not_found',
          title: 'Track Not Found'
        });
      }

      if (result.outcome === FetchWholeOutcome.NotEligible) {
        return sendProblem(reply, {
          status: 409,
          code: 'track_not_fetchable',
          title: 'Track Not Fetchable',
          detail:
            'Only a track that is waiting to be fetched can be fetched whole.'
        });
      }

      if (result.outcome === FetchWholeOutcome.Ok) {
        context.kickDownloads();
        return reply.send(result.track);
      }

      return exhaust(result);
    }
  );
}
