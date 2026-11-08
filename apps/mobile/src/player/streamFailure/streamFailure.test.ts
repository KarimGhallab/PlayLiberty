import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';

import { mobileSession } from '../../auth/session/session';
import type { ApiConfig } from '../../auth/useApiConfig';
import { classifyStreamFailure } from './streamFailure';

jest.mock('../../auth/session/session', () => ({
  mobileSession: { renewAccessToken: jest.fn() }
}));

const config: ApiConfig = {
  baseUrl: 'https://instance.test',
  token: { id: 'token-id', secret: 'token-secret' }
};
const renewed = { id: 'renewed-id', secret: 'renewed-secret' };
const renew = jest.mocked(mobileSession.renewAccessToken);
let fetchMock: jest.SpiedFunction<typeof fetch>;

function response(status: number): Response {
  return new Response(null, { status });
}

function headersOf(call: number): Headers {
  return new Headers(fetchMock.mock.calls[call]?.[1]?.headers);
}

beforeEach(() => {
  fetchMock = jest.spyOn(globalThis, 'fetch');
  renew.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the stream failure classifier', () => {
  it('reports a missing stored file as gone', async () => {
    fetchMock.mockResolvedValue(response(404));

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toEqual({
      kind: 'gone'
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://instance.test/api/v1/tracks/track-1/stream'
    );
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('HEAD');
    expect(headersOf(0).get('P-Access-Token-Id')).toBe('token-id');
    expect(headersOf(0).get('P-Access-Token')).toBe('token-secret');
  });

  it('drops a fileless entry on a 409', async () => {
    fetchMock.mockResolvedValue(response(409));

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toEqual({
      kind: 'gone'
    });
  });

  it('drops a definitively refused entry on a 403', async () => {
    fetchMock.mockResolvedValue(response(403));

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toEqual({
      kind: 'gone'
    });
  });

  it('renews a refused stream and reports the new pair', async () => {
    renew.mockResolvedValue(renewed);
    fetchMock
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(200));

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toEqual({
      kind: 'retry',
      token: renewed
    });
    expect(renew).toHaveBeenCalledWith(config.token);
    expect(headersOf(1).get('P-Access-Token-Id')).toBe('renewed-id');
  });

  it('reports the session when the renewal fails', async () => {
    renew.mockResolvedValue(null);
    fetchMock.mockResolvedValue(response(401));

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toEqual({
      kind: 'session'
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('leaves a server refusal unclassified', async () => {
    fetchMock.mockResolvedValue(response(503));

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toEqual({
      kind: 'unknown'
    });
  });

  it('leaves a network failure unclassified', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toEqual({
      kind: 'unknown'
    });
  });
});
