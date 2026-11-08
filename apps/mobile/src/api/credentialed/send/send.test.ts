import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { NeedsProvisioningError } from '../credentialed';
import type { RenewAccessToken } from './send';
import { sendCredentialed } from './send';

const config = {
  baseUrl: 'https://instance.test',
  token: { id: 'access-1', secret: 'secret-1' }
};
const renewed = { id: 'access-2', secret: 'secret-2' };
const fetchMock = jest.spyOn(globalThis, 'fetch');

function response(status: number): Response {
  return new Response(null, { status });
}

function headersOf(call: number): Headers {
  const init = fetchMock.mock.calls[call]?.[1];

  return new Headers(init?.headers);
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('a credentialed send', () => {
  it('sends once with the access pair and the user agent', async () => {
    fetchMock.mockResolvedValue(response(200));

    const result = await sendCredentialed(config, '/tracks/1', {
      method: 'HEAD'
    });

    expect(result).toEqual({ response: expect.any(Response), renewed: null });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://instance.test/api/v1/tracks/1'
    );
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('HEAD');
    expect(headersOf(0).get('P-Access-Token-Id')).toBe('access-1');
    expect(headersOf(0).get('P-Access-Token')).toBe('secret-1');
  });

  it('renews one refused pair and retries with the new one', async () => {
    const renew = jest.fn<RenewAccessToken>(async () => renewed);

    fetchMock
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(200));

    const result = await sendCredentialed(config, '/tracks/1', {}, renew);

    expect(renew).toHaveBeenCalledWith(config.token);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(headersOf(1).get('P-Access-Token-Id')).toBe('access-2');
    expect(headersOf(1).get('P-Access-Token')).toBe('secret-2');
    expect(result.renewed).toEqual(renewed);
    expect(result.response.status).toBe(200);
  });

  it('throws the provisioning verdict when the renewal fails', async () => {
    const renew = jest.fn(async () => null);

    fetchMock.mockResolvedValueOnce(response(401));

    await expect(
      sendCredentialed(config, '/tracks/1', {}, renew)
    ).rejects.toBeInstanceOf(NeedsProvisioningError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('passes a transport failure through', async () => {
    const error = new Error('offline');

    fetchMock.mockRejectedValueOnce(error);

    await expect(sendCredentialed(config, '/tracks/1')).rejects.toBe(error);
  });
});
