import { describe, expect, it } from 'vitest';

import { PangolinClient } from './PangolinClient.js';

const CONFIG = {
  apiUrl: 'https://api.example.com/v1',
  resourceId: 12,
  apiKey: 'the-key'
};

function recordingFetch(response: Response) {
  const calls: Array<{
    url: string;
    init: Parameters<typeof fetch>[1];
  }> = [];

  const fetchMock = (async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1]
  ) => {
    calls.push({ url: String(input), init });

    return response;
  }) as typeof fetch;

  return { calls, fetchMock };
}

describe('deleteResourceAccessToken', () => {
  it('deletes the token at the integration endpoint with the key', async () => {
    const { calls, fetchMock } = recordingFetch(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    const client = new PangolinClient(CONFIG, fetchMock);

    await client.deleteResourceAccessToken('token id');

    expect(calls[0]?.url).toBe(
      'https://api.example.com/v1/access-token/token%20id'
    );
    expect(calls[0]?.init?.method).toBe('DELETE');
    expect(new Headers(calls[0]?.init?.headers).get('authorization')).toBe(
      'Bearer the-key'
    );
  });

  it('refuses a deletion the API rejects', async () => {
    const { fetchMock } = recordingFetch(
      new Response(
        JSON.stringify({ success: false, message: 'no such token' }),
        {
          status: 200
        }
      )
    );
    const client = new PangolinClient(CONFIG, fetchMock);

    await expect(client.deleteResourceAccessToken('token-id')).rejects.toThrow(
      /no such token/
    );
  });

  it('treats an already-deleted token as done', async () => {
    const { fetchMock } = recordingFetch(new Response(null, { status: 404 }));
    const client = new PangolinClient(CONFIG, fetchMock);

    await expect(
      client.deleteResourceAccessToken('token-id')
    ).resolves.toBeUndefined();
  });
});
