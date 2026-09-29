import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { AppContext } from '../../shared/context.js';
import { sendProblem } from '../../shared/problem.js';

import { resolveAccount } from '../../features/accounts/accountService.js';
import type { AuthAccount } from '../../features/accounts/types.js';

/*
 * The identity headers the edge injects, and the account they become. This is the
 * pipeline's whole job: read three headers, refuse the request if they are absent,
 * and hand what arrived to the accounts feature. It fails closed, so a request that
 * reaches the server without the edge's headers is a 401 rather than an anonymous
 * caller, which is the ADR 0003 decision in one place.
 *
 * The account is written to the request rather than to a closure because a route
 * that needs to know who is calling should say `request.account` and have the
 * compiler enforce that the hook ran. The augmentation is here rather than in the
 * accounts feature because this is the only place that assigns it, and a type
 * declared where it is produced is one less thing to look up.
 */
declare module 'fastify' {
  interface FastifyRequest {
    account: AuthAccount;
  }
}

// The two paths the edge may reach without a Pangolin session. Readiness has to
// answer before a caller is known, and nothing else is exempt: in particular
// POST /auth/exchange is not here, because the mobile provisioning flow is
// unauthenticated in the sense that it carries no identity header, and it still
// has to fail closed if the edge did not vouch for it.
const EXEMPT_PATHS = new Set(['/healthz', '/readyz']);

function readStringHeader(
  request: FastifyRequest,
  name: string
): string | null {
  const value = request.headers[name];

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return null;
}

function requestPath(request: FastifyRequest): string {
  const [path] = request.url.split('?');
  return path ?? request.url;
}

export function registerIdentityHook(
  app: FastifyInstance,
  context: AppContext
): void {
  app.addHook('onRequest', async (request, reply) => {
    if (EXEMPT_PATHS.has(requestPath(request))) {
      return;
    }

    const pangolinUserId = readStringHeader(request, 'remote-user');

    if (pangolinUserId === null) {
      sendProblem(reply, {
        status: 401,
        code: 'unauthenticated',
        title: 'Unauthenticated',
        detail:
          'The request is missing the identity headers injected by the edge.'
      });
      return reply;
    }

    request.account = resolveAccount(
      {
        database: context.database,
        adminPangolinUserIds: context.config.adminPangolinUserIds
      },
      {
        pangolinUserId,
        name: readStringHeader(request, 'remote-name'),
        email: readStringHeader(request, 'remote-email')
      }
    );
    return undefined;
  });
}
