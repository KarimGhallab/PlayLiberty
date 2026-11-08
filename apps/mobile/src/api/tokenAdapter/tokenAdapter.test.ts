import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  ACCESS_TOKEN_HEADER,
  ACCESS_TOKEN_ID_HEADER,
  ApiError,
  CLIENT_HEADER,
  createTransport
} from '@playliberty/api-client';
import {
  HttpMethod,
  defineCommandEndpoint,
  defineEndpoint
} from '@playliberty/contracts';

import type { AccessToken } from '../credentialed/credentialed';
import { NeedsProvisioningError } from '../credentialed/credentialed';
import { USER_AGENT } from '../userAgent';
import type { TokenAdapterOptions } from './tokenAdapter';
import { tokenAdapter } from './tokenAdapter';

const BASE = 'https://instance.test';
const TOKEN: AccessToken = { id: 'token-id', secret: 'token-secret' };
const RENEWED: AccessToken = { id: 'renewed-id', secret: 'renewed-secret' };

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
  readToken: () => Promise<AccessToken | null> = async () => TOKEN,
  renewToken: (
    refused: AccessToken
  ) => Promise<AccessToken | null> = async () => RENEWED
) {
  const options: TokenAdapterOptions = { readToken, renewToken };

  return createTransport({
    baseUrl: BASE,
    client: 'mobile',
    adapter: tokenAdapter(options)
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('the token adapter', () => {
  it('sends both token headers, the app agent and no client header on a read', async () => {
    fetchMock.mockResolvedValue(json({ status: 'ok' }));

    const body = await client().send(health);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);

    expect(body.status).toBe('ok');
    expect(url).toBe(`${BASE}/api/v1/healthz`);
    expect(headers.get(ACCESS_TOKEN_ID_HEADER)).toBe(TOKEN.id);
    expect(headers.get(ACCESS_TOKEN_HEADER)).toBe(TOKEN.secret);
    expect(headers.get('User-Agent')).toBe(USER_AGENT);
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

    expect(headers.get(CLIENT_HEADER)).toBe('mobile');
  });

  it('renews once and retries a refused read with the new pair', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ title: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(json({ status: 'ok' }));
    const renew = jest.fn<
      (refused: AccessToken) => Promise<AccessToken | null>
    >(async () => RENEWED);

    const body = await client(async () => TOKEN, renew).send(health);

    const [, retryInit] = fetchMock.mock.calls[1] ?? [];
    const headers = new Headers(retryInit?.headers);

    expect(body.status).toBe('ok');
    expect(renew).toHaveBeenCalledWith(TOKEN);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(headers.get(ACCESS_TOKEN_ID_HEADER)).toBe(RENEWED.id);
    expect(headers.get(ACCESS_TOKEN_HEADER)).toBe(RENEWED.secret);
  });

  it('does not sign out when a fresh pair is refused too', async () => {
    fetchMock.mockResolvedValue(json({ title: 'Unauthorized' }, 401));

    const failure = await client()
      .send(health)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).not.toBeInstanceOf(NeedsProvisioningError);
    expect((failure as ApiError).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('needs provisioning when the renewal ends the session', async () => {
    fetchMock.mockResolvedValue(json({ title: 'Unauthorized' }, 401));

    await expect(
      client(
        async () => TOKEN,
        async () => null
      ).send(health)
    ).rejects.toBeInstanceOf(NeedsProvisioningError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces a transient renewal failure without a retry', async () => {
    fetchMock.mockResolvedValue(json({ title: 'Unauthorized' }, 401));
    const transient = new Error('offline');

    await expect(
      client(
        async () => TOKEN,
        async () => {
          throw transient;
        }
      ).send(health)
    ).rejects.toBe(transient);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses to send without a token', async () => {
    await expect(client(async () => null).send(health)).rejects.toBeInstanceOf(
      NeedsProvisioningError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
