import type { FastifyInstance, FastifyRequest } from 'fastify';

import { ProblemCode } from '@playliberty/contracts';

import { audit } from '../../../shared/audit.js';
import { sendProblem } from '../../../shared/problem.js';

/* Three mutating-request checks: client header, not cross-site, origin ours.
 * A read is not checked, since the header would break the player's GETs. */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/* A refused mutation is audited with its path and reason before the problem is
 * written. */
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
        code: ProblemCode.CsrfHeaderMissing,
        title: 'Forbidden',
        detail: 'Mutating requests must carry the X-PlayLiberty-Client header.'
      });
      return reply;
    }

    if (request.headers['sec-fetch-site'] === 'cross-site') {
      auditCsrfRefusal(request, 'csrf_cross_site');
      sendProblem(reply, {
        status: 403,
        code: ProblemCode.CsrfCrossSite,
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
          code: ProblemCode.CsrfOriginMismatch,
          title: 'Forbidden',
          detail: 'The request origin is not allowed.'
        });
        return reply;
      }
    }

    return undefined;
  });
}
