import type { ServerResponse } from 'node:http';

import type { FastifyInstance } from 'fastify';

import type { LiveEvent } from '@playliberty/contracts';
import { LiveEventType } from '@playliberty/contracts';

import type { AppContext } from '../../../shared/context.js';

/*
 * The live stream, one connection per tab. The route hijacks the reply as
 * `text/event-stream`: `ready`, then a frame per event the bus delivers, with a
 * heartbeat comment so a proxy does not time it out.
 */

export interface EventRouteOptions {
  heartbeatMs: number;
}

export const DEFAULT_EVENT_HEARTBEAT_MS = 20_000;

export function registerEventRoutes(
  app: FastifyInstance,
  context: AppContext,
  options: EventRouteOptions
): void {
  app.get('/events', (request, reply) => {
    reply.hijack();

    const response = reply.raw;

    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    let open = true;

    writeEvent(response, { type: LiveEventType.Ready });

    const unsubscribe = context.events.subscribe(request.account.id, event => {
      if (open) {
        writeEvent(response, event);
      }
    });

    const heartbeat = setInterval(() => {
      if (open) {
        response.write(': keepalive\n\n');
      }
    }, options.heartbeatMs);

    /* Close and error are one event: stop the heartbeat, leave the bus.
     * The flag keeps a same-tick publish off a dead socket. */
    const close = (): void => {
      if (!open) {
        return;
      }

      open = false;
      clearInterval(heartbeat);
      unsubscribe();
    };

    response.on('close', close);
    response.on('error', close);
  });
}

function writeEvent(response: ServerResponse, event: LiveEvent): void {
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}
