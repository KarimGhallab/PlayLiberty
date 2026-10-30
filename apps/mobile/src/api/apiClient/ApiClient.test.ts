import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  HttpMethod,
  defineCommandEndpoint,
  defineEndpoint
} from '@playliberty/contracts';

import {
  ACCESS_TOKEN_HEADER,
  ACCESS_TOKEN_ID_HEADER,
  type AccessToken,
  ApiClient,
  CLIENT_HEADER,
  CLIENT_HEADER_VALUE,
  NeedsProvisioningError
} from './ApiClient';

const BASE = 'https://instance.test';
const TOKEN: AccessToken = { id: 'token-id', secret: 'token-secret' };

const health = defineEndpoint({
  method: HttpMethod.Get,
  path: '/healthz',
  errors: [],
  response: {
    parse: (input: unknown) => {
      if (typeof input === 'object' && input !== null && 'status' in input) {
        return { status: String(input.status) };
      }

      throw new Error('The body is not a health answer.');
    }
  }
});

const rename = defineCommandEndpoint({
  method: HttpMethod.Patch,
  path: '/playlists/:playlistId',
  errors: []
});

const fetchMock = jest.spyOn(globalThis, 'fetch');

beforeEach(() => {
  fetchMock.mockReset();
});

function client(
  readToken: () => Promise<AccessToken | null> = async () => TOKEN
): ApiClient {
  return new ApiClient({ baseUrl: BASE, readToken });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('the API client', () => {
  it('sends both token headers on a read and no client header', async () => {
    fetchMock.mockResolvedValue(json({ status: 'ok' }));

    const body = await client().send(health);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);

    expect(body.status).toBe('ok');
    expect(url).toBe(`${BASE}/api/v1/healthz`);
    expect(headers.get(ACCESS_TOKEN_ID_HEADER)).toBe(TOKEN.id);
    expect(headers.get(ACCESS_TOKEN_HEADER)).toBe(TOKEN.secret);
    expect(headers.get(CLIENT_HEADER)).toBeNull();
  });

  it('appends the query it is given', async () => {
    fetchMock.mockResolvedValue(json({ status: 'ok' }));

    await client().send(health, {}, {}, { limit: 200 });

    const [url] = fetchMock.mock.calls[0] ?? [];

    expect(url).toBe(`${BASE}/api/v1/healthz?limit=200`);
  });

  it('marks a mutation with the client header', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await client().command(rename, { playlistId: 'p1' });

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);

    expect(headers.get(CLIENT_HEADER)).toBe(CLIENT_HEADER_VALUE);
  });

  it('treats a 401 as needing provisioning', async () => {
    fetchMock.mockResolvedValue(json({ title: 'Unauthorized' }, 401));

    await expect(client().send(health)).rejects.toBeInstanceOf(
      NeedsProvisioningError
    );
  });

  it('refuses to send without a token', async () => {
    await expect(client(async () => null).send(health)).rejects.toBeInstanceOf(
      NeedsProvisioningError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
