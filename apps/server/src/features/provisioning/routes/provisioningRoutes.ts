import type { FastifyInstance } from 'fastify';

import {
  ExchangeInputSchema,
  ProblemCode,
  ProvisionQuerySchema,
  endpoints
} from '@playliberty/contracts';

import type { AppContext } from '../../../shared/context.js';
import {
  parseBody,
  sendProblem,
  sendValidationFailed
} from '../../../shared/problem.js';
import { registerEndpoint } from '../../../shared/registerEndpoint.js';

/* 180 days, the token life the architecture records. */
export const MOBILE_TOKEN_LIFETIME_SECONDS = 180 * 24 * 60 * 60;

const TOKEN_TITLE = 'PlayLiberty mobile';

function sendInvalidGrant(reply: Parameters<typeof sendProblem>[0]) {
  return sendProblem(reply, {
    status: 400,
    code: ProblemCode.InvalidGrant,
    title: 'Invalid Grant'
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
      return sendProblem(reply, {
        status: 503,
        code: ProblemCode.ProvisioningUnavailable,
        title: 'Service Unavailable'
      });
    }

    if (!context.provisioning.allowExchange(request.ip)) {
      return sendProblem(reply, {
        status: 429,
        code: ProblemCode.RateLimited,
        title: 'Too Many Requests'
      });
    }

    const parsed = parseBody(ExchangeInputSchema, request.body);

    if (!parsed.success) {
      return sendValidationFailed(reply, parsed.issues);
    }

    const { code, code_verifier, redirect_uri } = parsed.data;
    const entry = context.provisioning.consumeCode(code);

    /* One refusal for a missing, used, expired, mismatched or unverified code:
     * the caller learns nothing about which. */
    if (
      entry === null ||
      context.provisioning.isExpired(entry) ||
      entry.redirectUri !== redirect_uri ||
      !context.provisioning.verifyPkce(code_verifier, entry.codeChallenge)
    ) {
      return sendInvalidGrant(reply);
    }

    try {
      const token = await context.pangolin.mintResourceAccessToken({
        pangolinUserId: entry.pangolinUserId,
        validForSeconds: MOBILE_TOKEN_LIFETIME_SECONDS,
        title: TOKEN_TITLE
      });

      return reply.send(token);
    } catch (error) {
      request.log.error({ err: error }, 'the token could not be minted');

      return sendProblem(reply, {
        status: 502,
        code: ProblemCode.ProvisioningFailed,
        title: 'Bad Gateway'
      });
    }
  });
}
