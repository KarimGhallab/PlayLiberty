import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { optimisticPatch, restoreOptimistic } from './optimistic.js';

const KEY = ['count'] as const;

describe('optimisticPatch', () => {
  it('cancels, snapshots and applies the change', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(KEY, 1);
    const cancel = vi.spyOn(queryClient, 'cancelQueries');

    const context = await optimisticPatch<number>(
      queryClient,
      KEY,
      previous => previous + 1
    );

    expect(cancel).toHaveBeenCalledWith({ queryKey: KEY });
    expect(queryClient.getQueryData(KEY)).toBe(2);
    expect(context.previous).toBe(1);
  });

  it('leaves an absent read absent and does not create one', async () => {
    const queryClient = new QueryClient();
    const apply = vi.fn((previous: number) => previous + 1);

    const context = await optimisticPatch(queryClient, KEY, apply);

    expect(apply).not.toHaveBeenCalled();
    expect(context.previous).toBeUndefined();
    expect(queryClient.getQueryData(KEY)).toBeUndefined();
  });
});

describe('restoreOptimistic', () => {
  it('puts the snapshot back after a refusal', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(KEY, 1);
    const context = await optimisticPatch<number>(
      queryClient,
      KEY,
      previous => previous + 1
    );

    restoreOptimistic(queryClient, KEY, context);

    expect(queryClient.getQueryData(KEY)).toBe(1);
  });

  it('does nothing when the read was absent', () => {
    const queryClient = new QueryClient();

    restoreOptimistic(queryClient, KEY, { previous: undefined });

    expect(queryClient.getQueryData(KEY)).toBeUndefined();
  });
});
