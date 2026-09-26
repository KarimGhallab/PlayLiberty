import type { FastifyInstance } from 'fastify';

import { sendProblem } from '../errors/problem.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface CsrfGuardOptions {
  publicOrigin: string | null;
}

export function registerCsrfGuard(
  app: FastifyInstance,
  options: CsrfGuardOptions
): void {
  app.addHook('onRequest', async (request, reply) => {
    if (!MUTATING_METHODS.has(request.method)) {
      return;
    }

    const clientHeader = request.headers['x-playliberty-client'];

    if (typeof clientHeader !== 'string' || clientHeader.length === 0) {
      sendProblem(reply, {
        status: 403,
        code: 'csrf_header_missing',
        title: 'Forbidden',
        detail: 'Mutating requests must carry the X-PlayLiberty-Client header.'
      });
      return reply;
    }

    if (request.headers['sec-fetch-site'] === 'cross-site') {
      sendProblem(reply, {
        status: 403,
        code: 'csrf_cross_site',
        title: 'Forbidden',
        detail: 'Cross-site mutating requests are rejected.'
      });
      return reply;
    }

    if (options.publicOrigin !== null) {
      const origin = request.headers.origin;

      if (typeof origin === 'string' && origin !== options.publicOrigin) {
        sendProblem(reply, {
          status: 403,
          code: 'csrf_origin_mismatch',
          title: 'Forbidden',
          detail: 'The request origin is not allowed.'
        });
        return reply;
      }
    }

    return undefined;
  });
}
