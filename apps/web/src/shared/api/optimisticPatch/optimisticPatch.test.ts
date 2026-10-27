import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { optimisticPatch, restoreOptimistic } from './optimisticPatch';

interface Counter {
  value: number;
}

describe('the optimistic patch', () => {
  it('cancels the read, snapshots it and applies the change', async () => {
    const client = new QueryClient();
    client.setQueryData<Counter>(['counter'], { value: 1 });
    const cancel = vi.spyOn(client, 'cancelQueries');

    const context = await optimisticPatch<Counter>(
      client,
      ['counter'],
      previous => ({ value: previous.value + 1 })
    );

    expect(cancel).toHaveBeenCalledWith({ queryKey: ['counter'] });
    expect(client.getQueryData<Counter>(['counter'])).toEqual({ value: 2 });
    expect(context.previous).toEqual({ value: 1 });
  });

  it('restores the snapshot on a refused write', async () => {
    const client = new QueryClient();
    client.setQueryData<Counter>(['counter'], { value: 1 });
    const context = await optimisticPatch<Counter>(
      client,
      ['counter'],
      previous => ({ value: previous.value + 1 })
    );

    restoreOptimistic(client, ['counter'], context);

    expect(client.getQueryData<Counter>(['counter'])).toEqual({ value: 1 });
  });

  it('leaves an absent read absent', async () => {
    const client = new QueryClient();
    const context = await optimisticPatch<Counter>(
      client,
      ['counter'],
      previous => previous
    );

    expect(context.previous).toBeUndefined();
    expect(client.getQueryData(['counter'])).toBeUndefined();
  });
});
