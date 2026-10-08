import type { FastifyInstance, FastifyRequest } from 'fastify';

import { audit } from '../../../shared/audit.js';
import { sendProblem } from '../../../shared/problem.js';

/*
 * The three checks ADR 0006 requires on a mutating request: the client header is
 * present, the request is not cross-site, and the origin is ours. They are one hook
 * beside the identity hook because they are the same kind of thing, a request that
 * is refused before a route sees it, and because a fourth check added to one of
 * them later belongs next to the other two rather than in a route.
 *
 * A read is not checked. There is nothing to protect, and requiring the header on
 * a GET would break the thumbnail and stream requests a player makes without it.
 */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/*
 * A refused mutation is the other half of the refusal trail: the request passed
 * the identity check but did not prove intent, so it is recorded with the path
 * and the reason before the problem is written.
 */
function auditCsrfRefusal(request: FastifyRequest, reason: string): void {
  const [path] = request.url.split('?');

  audit(request.log, {
    action: 'csrf_refused',
    outcome: 'refused',
    reason,
    path: path ?? request.url
  });
}

export interface CsrfHookOptions {
  publicOrigin: string | null;
}

export function registerCsrfHook(
  app: FastifyInstance,
  options: CsrfHookOptions
): void {
  app.addHook('onRequest', async (request, reply) => {
    if (!MUTATING_METHODS.has(request.method)) {
      return;
    }

    const clientHeader = request.headers['x-playliberty-client'];

    if (typeof clientHeader !== 'string' || clientHeader.length === 0) {
      auditCsrfRefusal(request, 'csrf_header_missing');
      sendProblem(reply, {
        status: 403,
        code: 'csrf_header_missing',
        title: 'Forbidden',
        detail: 'Mutating requests must carry the X-PlayLiberty-Client header.'
      });
      return reply;
    }

    if (request.headers['sec-fetch-site'] === 'cross-site') {
      auditCsrfRefusal(request, 'csrf_cross_site');
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
        auditCsrfRefusal(request, 'csrf_origin_mismatch');
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
