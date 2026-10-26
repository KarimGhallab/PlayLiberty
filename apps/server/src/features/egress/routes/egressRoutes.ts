import type { FastifyInstance, FastifyReply } from 'fastify';

import { ProblemCode, UserRole, endpoints } from '@playliberty/contracts';

import type { AppContext } from '../../../shared/context.js';
import { sendProblem } from '../../../shared/problem.js';
import { registerEndpoint } from '../../../shared/registerEndpoint.js';

import {
  probeEgress,
  readEgress,
  reconcileEgress,
  switchEgress
} from '../service/egressService.js';

function refuse(reply: FastifyReply) {
  return sendProblem(reply, {
    status: 404,
    code: ProblemCode.NotFound,
    title: 'Not Found'
  });
}

/* The egress is operator information: a non-admin gets the same not-found a
 * missing route would give, so the surface does not announce itself. */
export function registerEgressRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  registerEndpoint(app, endpoints.egress, async (request, reply) => {
    if (request.account.role !== UserRole.Admin) {
      return refuse(reply);
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

  registerEndpoint<{ Params: { name: string } }>(
    app,
    endpoints.probeEgress,
    async (request, reply) => {
      if (request.account.role !== UserRole.Admin) {
        return refuse(reply);
      }

      const result = await probeEgress(
        context.database,
        context.egressAgent,
        request.params.name
      );

      if (result.outcome === 'config_unknown') {
        return refuse(reply);
      }

      /* An unreachable agent is still an answer the page can draw: the rows
       * stay as they were and the control reports the failure. */
      if (result.outcome === 'agent_unreachable') {
        return reply.send({
          agentReachable: false,
          configs: readEgress(context.database)
        });
      }

      return reply.send(result.read);
    }
  );

  registerEndpoint<{ Params: { name: string } }>(
    app,
    endpoints.switchEgress,
    async (request, reply) => {
      if (request.account.role !== UserRole.Admin) {
        return refuse(reply);
      }

      const result = await switchEgress(
        context.database,
        context.egressAgent,
        request.params.name,
        context.config.egressDrainTimeoutMs
      );

      if (result.outcome === 'config_unknown') {
        return refuse(reply);
      }

      /* The agent was asked and refused: the active row is untouched, and the
       * page carries the agent's fixed sentence. */
      if (result.outcome === 'switch_failed') {
        return sendProblem(reply, {
          status: 502,
          code: ProblemCode.EgressSwitchFailed,
          title: 'Switch Failed',
          detail: result.message
        });
      }

      /* An unreachable agent is still an answer the page can draw. */
      if (result.outcome === 'agent_unreachable') {
        return reply.send({
          agentReachable: false,
          configs: readEgress(context.database)
        });
      }

      return reply.send(result.read);
    }
  );
}
