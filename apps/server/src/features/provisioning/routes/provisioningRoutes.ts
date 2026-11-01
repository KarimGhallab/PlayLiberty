import type { FastifyInstance, FastifyRequest } from 'fastify';

import {
  ExchangeInputSchema,
  ProblemCode,
  ProvisionQuerySchema,
  endpoints
} from '@playliberty/contracts';

import { audit } from '../../../shared/audit.js';
import type { AppContext } from '../../../shared/context.js';
import {
  parseBody,
  sendProblem,
  sendValidationFailed
} from '../../../shared/problem.js';
import { registerEndpoint } from '../../../shared/registerEndpoint.js';

import { issueMobileSession } from '../service/credentialService.js';

function sendInvalidGrant(reply: Parameters<typeof sendProblem>[0]) {
  return sendProblem(reply, {
    status: 400,
    code: ProblemCode.InvalidGrant,
    title: 'Invalid Grant'
  });
}

/* One audit line per exchange attempt: the outcome, the reason, and the
 * Pangolin user the code named. Never the code, verifier or token. */
function auditAllowed(request: FastifyRequest, pangolinUserId: string): void {
  audit(request.log, {
    action: 'provisioning_exchange',
    outcome: 'allowed',
    account: pangolinUserId
  });
}

function auditRefused(
  request: FastifyRequest,
  reason: string,
  pangolinUserId: string | null
): void {
  audit(request.log, {
    action: 'provisioning_exchange',
    outcome: 'refused',
    reason,
    ...(pangolinUserId === null ? {} : { account: pangolinUserId })
  });
}

export function registerProvisioningRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  /* Behind SSO: the edge has authenticated the browser, and the code is bound
   * to the user the edge named. */
  registerEndpoint(app, endpoints.provision, async (request, reply) => {
    if (context.config.mobileRedirectUris.length === 0) {
      return sendProblem(reply, {
        status: 503,
        code: ProblemCode.ProvisioningUnavailable,
        title: 'Service Unavailable'
      });
    }

    const parsed = parseBody(ProvisionQuerySchema, request.query);

    if (!parsed.success) {
      return sendValidationFailed(reply, parsed.issues);
    }

    const { code_challenge, redirect_uri, state } = parsed.data;

    if (!context.config.mobileRedirectUris.includes(redirect_uri)) {
      return sendInvalidGrant(reply);
    }

    const pangolinUserId = request.forwardedPangolinUserId;

    /* The identity hook refuses this path without an id; the guard keeps the
     * route from minting a code for nobody if that contract changes. */
    if (pangolinUserId === null) {
      return sendProblem(reply, {
        status: 401,
        code: ProblemCode.Unauthenticated,
        title: 'Unauthenticated'
      });
    }

    const code = context.provisioning.mintCode({
      pangolinUserId,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge
    });

    const target = new URL(redirect_uri);
    target.searchParams.set('code', code);
    target.searchParams.set('state', state);

    return reply.redirect(target.toString());
  });

  /* The one credential-less mutation: the code and its verifier for a token. */
  registerEndpoint(app, endpoints.exchange, async (request, reply) => {
    if (context.pangolin === null) {
      auditRefused(request, 'provisioning_unavailable', null);

      return sendProblem(reply, {
        status: 503,
        code: ProblemCode.ProvisioningUnavailable,
        title: 'Service Unavailable'
      });
    }

    if (!context.provisioning.allowExchange(request.ip)) {
      auditRefused(request, 'rate_limited', null);

      return sendProblem(reply, {
        status: 429,
        code: ProblemCode.RateLimited,
        title: 'Too Many Requests'
      });
    }

    const parsed = parseBody(ExchangeInputSchema, request.body);

    if (!parsed.success) {
      auditRefused(request, 'validation_failed', null);

      return sendValidationFailed(reply, parsed.issues);
    }

    const { code, code_verifier, redirect_uri } = parsed.data;
    const entry = context.provisioning.consumeCode(code);

    /* One refusal for a missing, used, expired, mismatched or unverified code:
     * the caller learns nothing about which. */
    if (entry === null) {
      auditRefused(request, 'code_missing_or_used', null);

      return sendInvalidGrant(reply);
    }

    if (context.provisioning.isExpired(entry)) {
      auditRefused(request, 'code_expired', entry.pangolinUserId);

      return sendInvalidGrant(reply);
    }

    if (entry.redirectUri !== redirect_uri) {
      auditRefused(request, 'redirect_mismatch', entry.pangolinUserId);

      return sendInvalidGrant(reply);
    }

    if (!context.provisioning.verifyPkce(code_verifier, entry.codeChallenge)) {
      auditRefused(request, 'verifier_mismatch', entry.pangolinUserId);

      return sendInvalidGrant(reply);
    }

    try {
      const pair = await issueMobileSession({
        database: context.database,
        pangolin: context.pangolin,
        lifetimes: {
          accessSeconds: context.config.mobileAccessTokenLifetimeSeconds,
          refreshSeconds: context.config.mobileRefreshTokenLifetimeSeconds,
          familySeconds: context.config.mobileFamilyLifetimeSeconds
        },
        pangolinUserId: entry.pangolinUserId,
        now: context.now
      });

      auditAllowed(request, entry.pangolinUserId);

      return reply.send(pair);
    } catch (error) {
      request.log.error({ err: error }, 'the token could not be minted');
      auditRefused(request, 'token_mint_failed', entry.pangolinUserId);

      return sendProblem(reply, {
        status: 502,
        code: ProblemCode.ProvisioningFailed,
        title: 'Bad Gateway'
      });
    }
  });
}
