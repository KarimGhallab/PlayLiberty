import type { ServerResponse } from 'node:http';

import type { FastifyInstance } from 'fastify';

import type { LiveEvent } from '@playliberty/contracts';
import { LiveEventType } from '@playliberty/contracts';

import type { AppContext } from '../../../shared/context.js';

/*
 * The live stream, one connection per tab. The route hijacks the reply and holds
 * it open as `text/event-stream`: it sends `ready` when the connection opens, then
 * one frame per event the bus delivers to this account's channel, and a comment
 * frame on a heartbeat so an idle connection is not closed by a proxy that would
 * otherwise time it out.
 *
 * It is a `GET`, so the client header the architecture requires does not apply and the identity hook
 * has already refused the request if the edge did not vouch for the caller. The
 * audience is decided by the publisher, not here: a connection subscribes on the
 * account the edge identified and receives only that account's events.
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

    /*
     * A client that goes away closes the socket, and a write that raced the close
     * surfaces as an error on the response. Both are the same event to us: stop
     * the heartbeat, leave the bus, and never write again. The flag is what keeps
     * a publish that lands in the same tick from writing to a dead socket.
     */
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
