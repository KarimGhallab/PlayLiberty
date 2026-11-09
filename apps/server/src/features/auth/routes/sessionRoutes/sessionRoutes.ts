import type { FastifyInstance } from 'fastify';

import { SessionRevokeInputSchema, endpoints } from '@playliberty/contracts';

import { audit } from '../../../../shared/audit.js';
import type { AppContext } from '../../../../shared/context.js';
import { parseBody, sendValidationFailed } from '../../../../shared/problem.js';
import { registerEndpoint } from '../../../../shared/registerEndpoint.js';

import { revokeSession } from '../../services/revokeSession.js';

/* Behind the edge: the access token in the headers authenticates the account,
 * and the body names the family to end. The answer never varies. */
export function registerSessionRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  registerEndpoint(app, endpoints.revokeSession, async (request, reply) => {
    const parsed = parseBody(SessionRevokeInputSchema, request.body);

    if (!parsed.success) {
      audit(request.log, {
        action: 'session_revoke',
        outcome: 'refused',
        reason: 'validation_failed',
        account: request.account.id
      });

      return sendValidationFailed(reply, parsed.issues);
    }

    const revoked = await revokeSession({
      database: context.database,
      pangolin: context.pangolin,
      pangolinUserId: request.account.pangolinUserId,
      refreshToken: parsed.data.refresh_token,
      now: context.now
    });

    /* The outcome is in the audit, not the answer: the caller must not learn
     * whether the family existed or belonged to it. */
    audit(request.log, {
      action: 'session_revoke',
      outcome: 'allowed',
      account: request.account.id,
      ...(revoked ? {} : { reason: 'nothing_to_revoke' })
    });

    return reply.code(204).send();
  });
}
