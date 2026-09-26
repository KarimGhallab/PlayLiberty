import type { FastifyInstance } from 'fastify';

import { sendNotImplemented } from '../errors/problem.js';
import { toAccountView } from './accountService.js';

export function registerAccountRoutes(app: FastifyInstance): void {
  app.get('/me', async request => toAccountView(request.account));

  app.get('/accounts', async (_request, reply) => {
    return sendNotImplemented(
      reply,
      'Listing accounts is not implemented yet.'
    );
  });
}
