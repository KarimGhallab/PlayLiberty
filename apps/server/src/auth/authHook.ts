import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { DatabaseHandle } from '../db/client.js';
import { sendProblem } from '../errors/problem.js';
import { resolveAccount } from './authService.js';

const EXEMPT_PATHS = new Set(['/healthz', '/readyz']);

export interface AuthHookOptions {
  database: DatabaseHandle;
  adminPangolinUserIds: string[];
}

function readStringHeader(
  request: FastifyRequest,
  name: string
): string | null {
  const value = request.headers[name];

  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return null;
}

function requestPath(request: FastifyRequest): string {
  const [path] = request.url.split('?');
  return path ?? request.url;
}

export function registerAuthHook(
  app: FastifyInstance,
  options: AuthHookOptions
): void {
  app.addHook('onRequest', async (request, reply) => {
    if (EXEMPT_PATHS.has(requestPath(request))) {
      return;
    }

    const pangolinUserId = readStringHeader(request, 'remote-user');

    if (pangolinUserId === null) {
      sendProblem(reply, {
        status: 401,
        code: 'unauthenticated',
        title: 'Unauthenticated',
        detail:
          'The request is missing the identity headers injected by the edge.'
      });
      return reply;
    }

    request.account = resolveAccount(
      {
        database: options.database,
        adminPangolinUserIds: options.adminPangolinUserIds
      },
      {
        pangolinUserId,
        name: readStringHeader(request, 'remote-name'),
        email: readStringHeader(request, 'remote-email')
      }
    );
    return undefined;
  });
}
