import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '@playliberty/api-client';

import { NeedsProvisioningError } from '../tokenAdapter/tokenAdapter';
import { createAppQueryClient } from './queryClient';

function failing(error: Error): () => Promise<never> {
  return async () => {
    throw error;
  };
}

describe('the app query client', () => {
  it('does not retry a 4xx', async () => {
    const client = createAppQueryClient(() => {});
    const queryFn = jest.fn(failing(new ApiError(404, null)));

    await expect(
      client.fetchQuery({ queryKey: ['read'], queryFn, retryDelay: 0 })
    ).rejects.toBeInstanceOf(ApiError);
    expect(queryFn).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('retries a 5xx to the web limit', async () => {
    const client = createAppQueryClient(() => {});
    const queryFn = jest.fn(failing(new ApiError(500, null)));

    await expect(
      client.fetchQuery({ queryKey: ['read'], queryFn, retryDelay: 0 })
    ).rejects.toBeInstanceOf(ApiError);
    expect(queryFn).toHaveBeenCalledTimes(4);
    client.clear();
  });

  it('reports a refused credential once, without retrying', async () => {
    const onRefused = jest.fn();
    const client = createAppQueryClient(onRefused);
    const queryFn = jest.fn(failing(new NeedsProvisioningError()));

    await expect(
      client.fetchQuery({ queryKey: ['me'], queryFn, retryDelay: 0 })
    ).rejects.toBeInstanceOf(NeedsProvisioningError);
    expect(onRefused).toHaveBeenCalledTimes(1);
    expect(queryFn).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('does not report an ordinary failure', async () => {
    const onRefused = jest.fn();
    const client = createAppQueryClient(onRefused);

    await expect(
      client.fetchQuery({
        queryKey: ['read'],
        queryFn: failing(new ApiError(500, null)),
        retryDelay: 0
      })
    ).rejects.toBeInstanceOf(ApiError);
    expect(onRefused).not.toHaveBeenCalled();
    client.clear();
  });

  it('reports a refused credential from a mutation once', async () => {
    const onRefused = jest.fn();
    const client = createAppQueryClient(onRefused);
    const mutation = client.getMutationCache().build(client, {
      mutationFn: failing(new NeedsProvisioningError()),
      retry: 0,
      gcTime: Infinity
    });

    await expect(mutation.execute(undefined)).rejects.toBeInstanceOf(
      NeedsProvisioningError
    );
    expect(onRefused).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('does not report an ordinary mutation failure', async () => {
    const onRefused = jest.fn();
    const client = createAppQueryClient(onRefused);
    const mutation = client.getMutationCache().build(client, {
      mutationFn: failing(new ApiError(500, null)),
      retry: 0,
      gcTime: Infinity
    });

    await expect(mutation.execute(undefined)).rejects.toBeInstanceOf(ApiError);
    expect(onRefused).not.toHaveBeenCalled();
    client.clear();
  });
});
