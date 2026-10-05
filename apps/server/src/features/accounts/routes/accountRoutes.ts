import type { FastifyInstance } from 'fastify';

import { PageQuerySchema } from '@playliberty/contracts';

import type { AppContext } from '../../../shared/context.js';
import { parseBody, sendInvalidRequest } from '../../../shared/problem.js';

import { listAccountSummaries, toAccountView } from '../accountService.js';

export function registerAccountRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  app.get('/me', async request => toAccountView(request.account));

  app.get('/accounts', async (request, reply) => {
    const parsed = parseBody(PageQuerySchema, request.query);

    if (!parsed.success) {
      return sendInvalidRequest(reply, parsed.message);
    }

    return reply.send(
      listAccountSummaries(context.database, {
        limit: parsed.data.limit,
        offset: parsed.data.offset
      })
    );
  });
}
