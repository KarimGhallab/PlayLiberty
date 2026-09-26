import type { FastifyInstance } from 'fastify';

import { exhaust } from '@playliberty/utils';

import { sendNotImplemented, sendProblem } from '../errors/problem.js';
import type { AppOptions } from '../http/appTypes.js';
import {
  resolveTrackForStream,
  resolveTrackForThumbnail
} from './trackService.js';
import { TrackStreamOutcome, TrackThumbnailOutcome } from './types.js';

export function registerTrackRoutes(
  app: FastifyInstance,
  options: AppOptions
): void {
  app.get<{ Params: { id: string } }>(
    '/tracks/:id/stream',
    async (request, reply) => {
      const result = resolveTrackForStream(
        options.database,
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
        options.database,
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
    async (_request, reply) => {
      return sendNotImplemented(
        reply,
        'Retrying a track is not implemented yet.'
      );
    }
  );
}
