import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type PendingAction,
  deferredActions,
  resetDeferredActions
} from './deferredAction.js';

function action(
  id: string,
  commit: () => void,
  overrides: Partial<PendingAction> = {}
): PendingAction {
  return {
    id,
    message: 'Deleting playlist',
    detail: id,
    commit,
    ...overrides
  };
}

describe('the deferred action store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetDeferredActions();
  });

  afterEach(() => {
    resetDeferredActions();
    vi.useRealTimers();
  });

  it('commits an action when its window closes', () => {
    const commit = vi.fn();

    deferredActions.defer(action('x', commit), 1000);

    expect(deferredActions.getSnapshot().map(window => window.id)).toEqual([
      'x'
    ]);
    expect(commit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(commit).toHaveBeenCalledTimes(1);
    expect(deferredActions.getSnapshot()).toEqual([]);
  });

  it('keeps the window until the grace ends', () => {
    const commit = vi.fn();

    deferredActions.defer(action('x', commit), 1000, { graceMs: 150 });

    vi.advanceTimersByTime(1000);

    expect(deferredActions.getSnapshot()).toHaveLength(1);
    expect(commit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(149);

    expect(commit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('cancels only the window it names', () => {
    const first = vi.fn();
    const second = vi.fn();
    const firstKey = deferredActions.defer(action('first', first), 1000);

    deferredActions.defer(action('second', second), 1000);
    deferredActions.cancel(firstKey);
    vi.advanceTimersByTime(1000);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('refreshes one window for a repeated press of the same action', () => {
    const commit = vi.fn();
    const key = deferredActions.defer(action('x', commit), 1000);

    vi.advanceTimersByTime(500);

    expect(deferredActions.defer(action('x', commit), 1000)).toBe(key);

    vi.advanceTimersByTime(600);

    expect(commit).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);

    expect(commit).toHaveBeenCalledTimes(1);
    expect(deferredActions.getSnapshot()).toEqual([]);
  });

  it('stacks different actions', () => {
    const first = vi.fn();
    const second = vi.fn();

    deferredActions.defer(action('first', first), 1000);
    deferredActions.defer(action('second', second), 1000);
    vi.advanceTimersByTime(1000);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('holds a paused window until the surface starts it', () => {
    const first = vi.fn();
    const second = vi.fn();

    deferredActions.defer(action('first', first), 1000, { started: false });
    deferredActions.defer(action('second', second), 1000, {
      started: false
    });
    vi.advanceTimersByTime(2000);

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(
      deferredActions.getSnapshot().every(
        window => !window.started && window.expiresAt === null
      )
    ).toBe(true);

    deferredActions.startAll();
    vi.advanceTimersByTime(999);

    expect(first).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('drops a window on reset without running its commit', () => {
    const commit = vi.fn();

    deferredActions.defer(action('x', commit), 1000);
    resetDeferredActions();
    vi.advanceTimersByTime(1000);

    expect(commit).not.toHaveBeenCalled();
    expect(deferredActions.getSnapshot()).toEqual([]);
  });
});
