import { timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { AppContext } from '../../../shared/context.js';
import { sendProblem } from '../../../shared/problem.js';

import { resolveAccount } from '../../../features/accounts/accountService.js';
import type { AuthAccount } from '../../../features/accounts/types.js';

/*
 * The identity headers the edge injects, and the account they become. This is the
 * pipeline's whole job: prove the request came from the edge, read three headers,
 * refuse the request if they are absent, and hand what arrived to the accounts
 * feature. It fails closed, so a request that reaches the server without the edge's
 * headers is a 401 rather than an anonymous caller, which is the ADR 0003 decision
 * in one place.
 *
 * The proof is a secret assertion header the edge injects. It closes the hole
 * ADR 0003's trust precondition left open: trusting `Remote-*` assumed the origin
 * was reachable only through the edge, and an assertion makes that true in the
 * origin rather than in the network. The assertion is required whenever it is
 * configured, and `loadConfig` refuses to start a production process without it; a
 * local run has no edge, so it runs without one.
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

/*
 * The secret assertion the edge injects, under the `X-PlayLiberty-Edge` header. It
 * is compared in constant time so a caller cannot learn the secret one byte at a
 * time from response timing.
 */
const EDGE_ASSERTION_HEADER = 'x-playliberty-edge';

function matchesEdgeAssertion(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);

  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}

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

    if (context.config.edgeAssertion !== null) {
      const assertion = readStringHeader(request, EDGE_ASSERTION_HEADER);

      if (
        assertion === null ||
        !matchesEdgeAssertion(assertion, context.config.edgeAssertion)
      ) {
        sendProblem(reply, {
          status: 401,
          code: 'unauthenticated',
          title: 'Unauthenticated',
          detail:
            'The request is missing the edge assertion the origin requires.'
        });
        return reply;
      }
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
