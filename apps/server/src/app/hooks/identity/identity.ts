import { timingSafeEqual } from 'node:crypto';

import type { FastifyInstance, FastifyRequest } from 'fastify';

import { ProblemCode } from '@playliberty/contracts';

import { audit } from '../../../shared/audit.js';
import type { AppContext } from '../../../shared/context.js';
import { sendProblem } from '../../../shared/problem.js';

import { resolveAccount } from '../../../features/accounts/accountService.js';
import type { AuthAccount } from '../../../features/accounts/types.js';

/*
 * The pipeline's whole job: prove the request came from the edge, read three
 * headers, refuse if absent, and hand them to accounts. It fails closed, so a
 * request without them is a 401. The edge assertion is the proof.
 */
declare module 'fastify' {
  interface FastifyRequest {
    account: AuthAccount;
  }
}

// The only paths exempt from identity: readiness must answer before a caller is
// known. Nothing else is exempt, so even the exchange route fails closed.
const EXEMPT_PATHS = new Set(['/healthz', '/readyz']);

/* The edge assertion header, compared in constant time so timing cannot
 * leak the secret a byte at a time. */
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

/* A refused request is an operator's only clue someone tried, so it is audited
 * before the problem is written. */
function auditIdentityRefusal(request: FastifyRequest, reason: string): void {
  audit(request.log, {
    action: 'identity_refused',
    outcome: 'refused',
    reason,
    path: requestPath(request),
    actor: readStringHeader(request, 'remote-user')
  });
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
        auditIdentityRefusal(request, 'edge_assertion_missing');
        sendProblem(reply, {
          status: 401,
          code: ProblemCode.Unauthenticated,
          title: 'Unauthenticated',
          detail:
            'The request is missing the edge assertion the origin requires.'
        });
        return reply;
      }
    }

    const pangolinUserId = readStringHeader(request, 'remote-user');

    if (pangolinUserId === null) {
      auditIdentityRefusal(request, 'identity_missing');
      sendProblem(reply, {
        status: 401,
        code: ProblemCode.Unauthenticated,
        title: 'Unauthenticated',
        detail:
          'The request is missing the identity headers injected by the edge.'
      });
      return reply;
    }

    const resolved = resolveAccount(
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
    request.account = resolved.account;

    if (resolved.roleChanged) {
      audit(request.log, {
        action: 'role_assigned',
        outcome: 'allowed',
        account: resolved.account.id,
        role: resolved.account.role
      });
    }

    return undefined;
  });
}
