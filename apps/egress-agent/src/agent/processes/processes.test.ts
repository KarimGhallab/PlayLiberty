import type { ChildProcess } from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChildRegistry } from './processes.js';

function fakeChild(pid: number): ChildProcess {
  return { pid, kill: vi.fn(() => true) } as unknown as ChildProcess;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChildRegistry', () => {
  it('forgets a child when it is released', () => {
    const registry = new ChildRegistry();
    const release = registry.track(fakeChild(10));

    expect(registry.size).toBe(1);

    release();

    expect(registry.size).toBe(0);
  });

  it('finishes a drain when the last child exits', async () => {
    const registry = new ChildRegistry();
    const release = registry.track(fakeChild(10));
    let drained = false;

    const drain = registry.drain(1000).then(() => {
      drained = true;
    });

    await Promise.resolve();
    expect(drained).toBe(false);

    release();
    await drain;

    expect(drained).toBe(true);
  });

  it('finishes a drain at the bound when the child is still running', async () => {
    const registry = new ChildRegistry();
    registry.track(fakeChild(10));

    const started = Date.now();
    await registry.drain(20);

    expect(Date.now() - started).toBeGreaterThanOrEqual(15);
    expect(registry.size).toBe(1);
  });

  it('kills the process group, not only the child', () => {
    const registry = new ChildRegistry();
    registry.track(fakeChild(4242));
    const kill = vi.spyOn(process, 'kill').mockReturnValue(true);

    registry.killAll();

    expect(kill).toHaveBeenCalledWith(-4242, 'SIGKILL');
  });

  it('reports an interruption while a switch runs and after a kill', () => {
    const registry = new ChildRegistry();

    expect(registry.interrupted).toBe(false);

    registry.beginSwitch();
    expect(registry.interrupted).toBe(true);

    registry.endSwitch();
    expect(registry.interrupted).toBe(false);

    registry.track(fakeChild(4242));
    vi.spyOn(process, 'kill').mockReturnValue(true);
    registry.killAll();
    expect(registry.interrupted).toBe(true);
  });
});
