import type { FastifyInstance } from 'fastify';

import { PageQuerySchema, endpoints } from '@playliberty/contracts';

import type { AppContext } from '../../../shared/context.js';
import { parseBody, sendValidationFailed } from '../../../shared/problem.js';
import { registerEndpoint } from '../../../shared/registerEndpoint.js';

import { listAccountSummaries, toAccountView } from '../accountService.js';

export function registerAccountRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  registerEndpoint(app, endpoints.currentAccount, async request =>
    toAccountView(request.account)
  );

  registerEndpoint(app, endpoints.accounts, async (request, reply) => {
    const parsed = parseBody(PageQuerySchema, request.query);

    if (!parsed.success) {
      return sendValidationFailed(reply, parsed.issues);
    }

    return reply.send(
      listAccountSummaries(context.database, {
        limit: parsed.data.limit,
        offset: parsed.data.offset
      })
    );
  });
}
