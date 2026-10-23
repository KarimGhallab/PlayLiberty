import type { FastifyInstance } from 'fastify';

import { ProblemCode, UserRole, endpoints } from '@playliberty/contracts';

import type { AppContext } from '../../../shared/context.js';
import { sendProblem } from '../../../shared/problem.js';
import { registerEndpoint } from '../../../shared/registerEndpoint.js';

import { readEgress, reconcileEgress } from '../service/egressService.js';

/* The egress is operator information: a non-admin gets the same not-found a
 * missing route would give, so the surface does not announce itself. */
export function registerEgressRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  registerEndpoint(app, endpoints.egress, async (request, reply) => {
    if (request.account.role !== UserRole.Admin) {
      return sendProblem(reply, {
        status: 404,
        code: ProblemCode.NotFound,
        title: 'Not Found'
      });
    }

    const agentReachable = await reconcileEgress(
      context.database,
      context.egressAgent
    );

    return reply.send({
      agentReachable,
      configs: readEgress(context.database)
    });
  });
}
