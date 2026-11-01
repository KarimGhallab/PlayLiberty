import type { FastifyInstance, FastifyRequest } from 'fastify';

import {
  ExchangeInputSchema,
  ProblemCode,
  ProvisionQuerySchema,
  RefreshInputSchema,
  endpoints
} from '@playliberty/contracts';

import { audit } from '../../../../shared/audit.js';
import type { AppContext } from '../../../../shared/context.js';
import {
  parseBody,
  sendProblem,
  sendValidationFailed
} from '../../../../shared/problem.js';
import { registerEndpoint } from '../../../../shared/registerEndpoint.js';

import { issueMobileSession } from '../../service/credentialService/credentialService.js';
import { RefreshGraceCache } from '../../service/refreshGraceCache/refreshGraceCache.js';
import { refreshMobileSession } from '../../service/refreshService.js';
import { sendInvalidGrant } from '../refusal.js';

/*
 * The browser entry and the two paths outside Pangolin SSO: a provisioning
 * code, its exchange, and the refresh rotation. One module because one
 * credential lifecycle owns them, and one audit shape covers every attempt.
 */

type AttemptAction = 'provisioning_exchange' | 'session_refresh';

type AttemptOutcome =
  | { readonly outcome: 'allowed' }
  | { readonly outcome: 'refused'; readonly reason: string };

/* One audit line per attempt: the outcome, the reason and the Pangolin user the
 * code or family named. Never the code, verifier or token. */
function auditAttempt(
  request: FastifyRequest,
  action: AttemptAction,
  outcome: AttemptOutcome,
  pangolinUserId: string | null
): void {
  audit(request.log, {
    action,
    ...outcome,
    ...(pangolinUserId === null ? {} : { account: pangolinUserId })
  });
}

export function registerAuthRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  registerProvisionRoutes(app, context);
  registerRefreshRoute(app, context, new RefreshGraceCache());
}

function registerProvisionRoutes(
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

  /* The one credential-less mutation: the code and its verifier for a pair. */
  registerEndpoint(app, endpoints.exchange, async (request, reply) => {
    if (context.pangolin === null) {
      auditAttempt(
        request,
        'provisioning_exchange',
        { outcome: 'refused', reason: 'provisioning_unavailable' },
        null
      );

      return sendProblem(reply, {
        status: 503,
        code: ProblemCode.ProvisioningUnavailable,
        title: 'Service Unavailable'
      });
    }

    if (!context.provisioning.allowAttempt(`exchange:${request.ip}`)) {
      auditAttempt(
        request,
        'provisioning_exchange',
        { outcome: 'refused', reason: 'rate_limited' },
        null
      );

      return sendProblem(reply, {
        status: 429,
        code: ProblemCode.RateLimited,
        title: 'Too Many Requests'
      });
    }

    const parsed = parseBody(ExchangeInputSchema, request.body);

    if (!parsed.success) {
      auditAttempt(
        request,
        'provisioning_exchange',
        { outcome: 'refused', reason: 'validation_failed' },
        null
      );

      return sendValidationFailed(reply, parsed.issues);
    }

    const { code, code_verifier, redirect_uri } = parsed.data;
    const entry = context.provisioning.consumeCode(code);

    /* One refusal for a missing, used, expired, mismatched or unverified code:
     * the caller learns nothing about which. */
    if (entry === null) {
      auditAttempt(
        request,
        'provisioning_exchange',
        { outcome: 'refused', reason: 'code_missing_or_used' },
        null
      );

      return sendInvalidGrant(reply);
    }

    if (context.provisioning.isExpired(entry)) {
      auditAttempt(
        request,
        'provisioning_exchange',
        { outcome: 'refused', reason: 'code_expired' },
        entry.pangolinUserId
      );

      return sendInvalidGrant(reply);
    }

    if (entry.redirectUri !== redirect_uri) {
      auditAttempt(
        request,
        'provisioning_exchange',
        { outcome: 'refused', reason: 'redirect_mismatch' },
        entry.pangolinUserId
      );

      return sendInvalidGrant(reply);
    }

    if (!context.provisioning.verifyPkce(code_verifier, entry.codeChallenge)) {
      auditAttempt(
        request,
        'provisioning_exchange',
        { outcome: 'refused', reason: 'verifier_mismatch' },
        entry.pangolinUserId
      );

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

      auditAttempt(
        request,
        'provisioning_exchange',
        { outcome: 'allowed' },
        entry.pangolinUserId
      );

      return reply.send(pair);
    } catch (error) {
      request.log.error({ err: error }, 'the token could not be minted');
      auditAttempt(
        request,
        'provisioning_exchange',
        { outcome: 'refused', reason: 'token_mint_failed' },
        entry.pangolinUserId
      );

      return sendProblem(reply, {
        status: 502,
        code: ProblemCode.ProvisioningFailed,
        title: 'Bad Gateway'
      });
    }
  });
}

function registerRefreshRoute(
  app: FastifyInstance,
  context: AppContext,
  grace: RefreshGraceCache
): void {
  /* The second credential-less mutation: a refresh token for the rotated pair.
   * The identity hook lets the POST through without identity; the token in the
   * body is the only credential, and the server checks it itself. */
  registerEndpoint(app, endpoints.refresh, async (request, reply) => {
    if (context.pangolin === null) {
      auditAttempt(
        request,
        'session_refresh',
        { outcome: 'refused', reason: 'provisioning_unavailable' },
        null
      );

      return sendProblem(reply, {
        status: 503,
        code: ProblemCode.ProvisioningUnavailable,
        title: 'Service Unavailable'
      });
    }

    if (!context.provisioning.allowAttempt(`refresh:${request.ip}`)) {
      auditAttempt(
        request,
        'session_refresh',
        { outcome: 'refused', reason: 'rate_limited' },
        null
      );

      return sendProblem(reply, {
        status: 429,
        code: ProblemCode.RateLimited,
        title: 'Too Many Requests'
      });
    }

    const parsed = parseBody(RefreshInputSchema, request.body);

    if (!parsed.success) {
      auditAttempt(
        request,
        'session_refresh',
        { outcome: 'refused', reason: 'validation_failed' },
        null
      );

      return sendValidationFailed(reply, parsed.issues);
    }

    const result = await refreshMobileSession({
      database: context.database,
      pangolin: context.pangolin,
      lifetimes: {
        accessSeconds: context.config.mobileAccessTokenLifetimeSeconds,
        refreshSeconds: context.config.mobileRefreshTokenLifetimeSeconds,
        familySeconds: context.config.mobileFamilyLifetimeSeconds
      },
      refreshToken: parsed.data.refresh_token,
      grace,
      allowAttempt: key => context.provisioning.allowAttempt(key),
      now: context.now
    });

    if (result.outcome === 'ok') {
      auditAttempt(
        request,
        'session_refresh',
        { outcome: 'allowed' },
        result.pangolinUserId
      );

      return reply.header('Cache-Control', 'no-store').send(result.pair);
    }

    if (result.outcome === 'invalid_grant') {
      auditAttempt(
        request,
        'session_refresh',
        { outcome: 'refused', reason: result.reason },
        result.pangolinUserId
      );

      return sendInvalidGrant(reply);
    }

    if (result.outcome === 'rate_limited') {
      auditAttempt(
        request,
        'session_refresh',
        { outcome: 'refused', reason: 'family_rate_limited' },
        result.pangolinUserId
      );

      return sendProblem(reply, {
        status: 429,
        code: ProblemCode.RateLimited,
        title: 'Too Many Requests'
      });
    }

    auditAttempt(
      request,
      'session_refresh',
      { outcome: 'refused', reason: 'token_mint_failed' },
      result.pangolinUserId
    );

    return sendProblem(reply, {
      status: 502,
      code: ProblemCode.ProvisioningFailed,
      title: 'Bad Gateway'
    });
  });
}
