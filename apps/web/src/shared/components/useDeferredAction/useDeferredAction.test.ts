import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDeferredActions } from './deferredActionStore';
import type { PendingAction } from './types';
import { useDeferredAction } from './useDeferredAction';

function action(id: string, commit: () => void, detail = id): PendingAction {
  return { id, message: 'Deleting playlist', detail, commit };
}

describe('useDeferredAction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    resetDeferredActions();
    vi.useRealTimers();
  });

  it('commits an action when its own window closes', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useDeferredAction(1000));

    act(() => result.current.defer(action('x', commit)));

    expect(commit).not.toHaveBeenCalled();
    expect(result.current.windows.map(window => window.id)).toEqual(['x']);

    act(() => vi.advanceTimersByTime(1000));

    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.windows).toEqual([]);
  });

  it('commits both windows when neither is cancelled', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result } = renderHook(() => useDeferredAction(1000));

    act(() => result.current.defer(action('a', first)));
    act(() => result.current.defer(action('b', second)));

    expect(result.current.windows.map(window => window.id)).toEqual(['a', 'b']);

    act(() => vi.advanceTimersByTime(1000));

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(result.current.windows).toEqual([]);
  });

  it('cancels only the window it names', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result } = renderHook(() => useDeferredAction(1000));

    act(() => result.current.defer(action('a', first)));
    act(() => result.current.defer(action('b', second)));

    const [firstWindow] = result.current.windows;
    act(() => result.current.cancel(firstWindow.key));

    expect(result.current.windows.map(window => window.id)).toEqual(['b']);

    act(() => vi.advanceTimersByTime(1000));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('commits a window when its surface unmounts', () => {
    const commit = vi.fn();
    const { result, unmount } = renderHook(() => useDeferredAction(1000));

    act(() => result.current.defer(action('x', commit)));
    unmount();

    act(() => vi.advanceTimersByTime(1000));

    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('keeps the open windows across a remount', () => {
    const commit = vi.fn();
    const first = renderHook(() => useDeferredAction(1000));

    act(() => first.result.current.defer(action('x', commit)));
    first.unmount();

    const second = renderHook(() => useDeferredAction(1000));

    expect(second.result.current.windows.map(window => window.id)).toEqual([
      'x'
    ]);

    act(() => vi.advanceTimersByTime(1000));

    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('refreshes one window for a repeated press of the same action', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result } = renderHook(() => useDeferredAction(1000));

    act(() => result.current.defer(action('a', first)));
    act(() => result.current.defer(action('a', second)));

    expect(result.current.windows).toHaveLength(1);

    act(() => vi.advanceTimersByTime(1000));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
