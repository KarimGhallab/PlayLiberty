import { describe, expect, it, vi } from 'vitest';

import { ChildRegistry } from '../processes/processes.js';
import { switchExit } from './switch.js';

describe('switchExit', () => {
  it('drains, kills what is left, then applies the config', async () => {
    const order: string[] = [];
    const registry = new ChildRegistry();
    vi.spyOn(registry, 'drain').mockImplementation(async () => {
      order.push('drain');
    });
    vi.spyOn(registry, 'killAll').mockImplementation(() => {
      order.push('kill');
    });

    await switchExit(
      {
        registry,
        apply: async () => {
          order.push('apply');
        }
      },
      '02-ch',
      1000
    );

    expect(order).toEqual(['drain', 'kill', 'apply']);
    expect(registry.interrupted).toBe(false);
  });

  it('ends the interruption window even when the apply fails', async () => {
    const registry = new ChildRegistry();
    vi.spyOn(registry, 'drain').mockResolvedValue(undefined);
    vi.spyOn(registry, 'killAll').mockImplementation(() => undefined);

    await expect(
      switchExit(
        {
          registry,
          apply: async () => {
            throw new Error('the interface is down');
          }
        },
        '02-ch',
        1000
      )
    ).rejects.toThrow('the interface is down');

    expect(registry.interrupted).toBe(false);
  });
});
