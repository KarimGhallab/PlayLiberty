import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';

import { StreamFailureKind } from '@playliberty/ui-foundation';

import type { ApiConfig } from '../../auth/useApiConfig';
import { classifyStreamFailure } from './streamFailure';

const config: ApiConfig = {
  baseUrl: 'https://instance.test',
  token: { id: 'token-id', secret: 'token-secret' }
};

let fetchMock: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.spyOn(globalThis, 'fetch');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the stream failure classifier', () => {
  it('reports a missing stored file as gone', async () => {
    fetchMock.mockResolvedValue({ status: 404 } as Response);

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toBe(
      StreamFailureKind.Gone
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://instance.test/api/v1/tracks/track-1/stream',
      {
        method: 'HEAD',
        headers: {
          'P-Access-Token-Id': 'token-id',
          'P-Access-Token': 'token-secret',
          'User-Agent': 'PlayLiberty/1.0 (Android)'
        }
      }
    );
  });

  it('drops a fileless entry on a 409 as web does', async () => {
    fetchMock.mockResolvedValue({ status: 409 } as Response);

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toBe(
      StreamFailureKind.Gone
    );
  });

  it('drops a definitively refused entry on a 403 as web does', async () => {
    fetchMock.mockResolvedValue({ status: 403 } as Response);

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toBe(
      StreamFailureKind.Gone
    );
  });

  it('reports an expired session as the session', async () => {
    fetchMock.mockResolvedValue({ status: 401 } as Response);

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toBe(
      StreamFailureKind.Session
    );
  });

  it('leaves a server refusal unclassified', async () => {
    fetchMock.mockResolvedValue({ status: 503 } as Response);

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toBe(
      StreamFailureKind.Unknown
    );
  });

  it('leaves a network failure unclassified', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    await expect(classifyStreamFailure(config, 'track-1')).resolves.toBe(
      StreamFailureKind.Unknown
    );
  });
});
