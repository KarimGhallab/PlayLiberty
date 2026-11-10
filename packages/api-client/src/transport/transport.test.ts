import { describe, expect, it, vi } from 'vitest';

import {
  HttpMethod,
  defineCommandEndpoint,
  defineEndpoint
} from '@playliberty/contracts';

import { ApiError } from '../apiError.js';
import { CLIENT_HEADER } from '../protocol.js';
import type { TransportAdapter, TransportRequest } from './transport.js';
import { createTransport } from './transport.js';

const health = defineEndpoint({
  method: HttpMethod.Get,
  path: '/healthz',
  errors: [],
  response: {
    parse: (input: unknown) => {
      if (typeof input !== 'object' || input === null || !('status' in input)) {
        throw new Error('The body is not a health answer.');
      }

      return { status: String(input.status) };
    }
  }
});

const rename = defineCommandEndpoint({
  method: HttpMethod.Patch,
  path: '/playlists/:playlistId',
  errors: []
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function adapter(
  respond: (request: TransportRequest) => Response = () =>
    json({ status: 'ok' })
): { readonly auth: TransportAdapter; readonly requests: TransportRequest[] } {
  const requests: TransportRequest[] = [];

  return {
    requests,
    auth: {
      send: async request => {
        requests.push(request);
        return respond(request);
      }
    }
  };
}

function client(auth: TransportAdapter) {
  return createTransport({
    baseUrl: 'https://instance.test',
    client: 'web',
    adapter: auth
  });
}

describe('the transport', () => {
  it('parses the response the endpoint declares', async () => {
    const body = await client(adapter().auth).send(health);

    expect(body).toEqual({ status: 'ok' });
  });

  it('builds the prefix, the path parameters and one encoded query', () => {
    const transport = client(adapter().auth);

    expect(
      transport.url(
        '/playlists/:playlistId/tracks',
        { playlistId: 'a b' },
        { limit: 50, state: 'in progress' }
      )
    ).toBe(
      'https://instance.test/api/v1/playlists/a%20b/tracks?limit=50&state=in%20progress'
    );
  });

  it('marks a mutation with the client header and leaves a read unmarked', async () => {
    const read = adapter();
    await client(read.auth).send(health);

    const mutation = adapter(() => new Response(null, { status: 204 }));
    await client(mutation.auth).command(rename, { playlistId: 'p1' });

    const readHeaders = new Headers(read.requests[0]?.init.headers);
    const mutationHeaders = new Headers(mutation.requests[0]?.init.headers);

    expect(readHeaders.get(CLIENT_HEADER)).toBeNull();
    expect(mutationHeaders.get(CLIENT_HEADER)).toBe('web');
  });

  it.each([401, 403, 404, 409])(
    'throws the package error for a %i',
    async status => {
      const failure = await client(
        adapter(() =>
          json(
            {
              type: 'about:blank',
              title: 'Refused',
              status,
              code: 'refused'
            },
            status
          )
        ).auth
      )
        .send(health)
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ApiError);
      expect((failure as ApiError).status).toBe(status);
      expect((failure as ApiError).problem?.title).toBe('Refused');
    }
  );

  it('holds no problem for a body that is not a problem document', async () => {
    const failure = await client(
      adapter(() => json({ error: 'boom' }, 500)).auth
    )
      .send(health)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).problem).toBeNull();
  });

  it('reports a probe status without throwing', async () => {
    const status = await client(
      adapter(() => new Response(null, { status: 404 })).auth
    ).probe('/media/track');

    expect(status).toBe(404);
  });

  it('does not parse the body of a command', async () => {
    const respond = vi.fn(() => new Response(null, { status: 204 }));

    await expect(
      client(adapter(respond).auth).command(rename, { playlistId: 'p1' })
    ).resolves.toBeUndefined();
  });
});
