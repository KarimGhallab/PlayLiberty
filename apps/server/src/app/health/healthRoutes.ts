import type { FastifyInstance } from 'fastify';

import type { AppContext } from '../../shared/context.js';

import { checkReadiness } from './healthService.js';

export function registerHealthRoutes(
  app: FastifyInstance,
  context: AppContext
): void {
  app.get('/healthz', async () => ({ status: 'ok' }));

  app.get('/readyz', async (request, reply) => {
    const readiness = await checkReadiness({
      database: context.database,
      mediaPaths: context.mediaPaths
    });

    if (!readiness.ready) {
      request.log.error({ err: readiness.error }, 'readiness check failed');
      return reply.code(503).send({ status: 'unavailable' });
    }

    return { status: 'ok' };
  });
}
