import type { FastifyInstance } from 'fastify';

import type { AppOptions } from '../http/appTypes.js';
import { checkReadiness } from './healthService.js';

export function registerHealthRoutes(
  app: FastifyInstance,
  options: AppOptions
): void {
  app.get('/healthz', async () => ({ status: 'ok' }));

  app.get('/readyz', async (request, reply) => {
    const readiness = await checkReadiness({
      database: options.database,
      mediaPaths: options.mediaPaths
    });

    if (!readiness.ready) {
      request.log.error({ err: readiness.error }, 'readiness check failed');
      return reply.code(503).send({ status: 'unavailable' });
    }

    return { status: 'ok' };
  });
}
