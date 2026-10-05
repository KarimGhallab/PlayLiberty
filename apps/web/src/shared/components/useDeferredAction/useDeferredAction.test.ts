import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDeferredAction } from './useDeferredAction';

describe('useDeferredAction', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the commit only when the window closes', () => {
    vi.useFakeTimers();
    const commit = vi.fn();
    const { result } = renderHook(() => useDeferredAction(1000));

    act(() =>
      result.current.defer({ message: 'Removed track', detail: 'x', commit })
    );

    expect(commit).not.toHaveBeenCalled();
    expect(result.current.pending?.message).toBe('Removed track');

    act(() => vi.advanceTimersByTime(1000));

    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBeNull();
  });

  it('cancels so the commit never runs', () => {
    vi.useFakeTimers();
    const commit = vi.fn();
    const { result } = renderHook(() => useDeferredAction(1000));

    act(() =>
      result.current.defer({ message: 'Removed track', detail: 'x', commit })
    );
    act(() => result.current.cancel());
    act(() => vi.advanceTimersByTime(5000));

    expect(commit).not.toHaveBeenCalled();
    expect(result.current.pending).toBeNull();
  });

  it('replaces a pending window rather than firing it', () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const { result } = renderHook(() => useDeferredAction(1000));

    act(() =>
      result.current.defer({ message: 'first', detail: null, commit: first })
    );
    act(() =>
      result.current.defer({ message: 'second', detail: null, commit: second })
    );
    act(() => vi.advanceTimersByTime(1000));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('reports the action a window displaced, and clears it when the window ends', () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const { result } = renderHook(() => useDeferredAction(1000));

    act(() =>
      result.current.defer({
        message: 'Deleting playlist',
        detail: 'A',
        commit: first
      })
    );
    const firstWindow = result.current.windowId;
    expect(result.current.replaced).toBeNull();

    act(() =>
      result.current.defer({
        message: 'Deleting playlist',
        detail: 'B',
        commit: second
      })
    );

    expect(result.current.replaced?.detail).toBe('A');
    expect(result.current.pending?.detail).toBe('B');
    expect(result.current.windowId).toBeGreaterThan(firstWindow);

    act(() => vi.advanceTimersByTime(1000));

    expect(result.current.replaced).toBeNull();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('reads a repeated press of the same action as one intent', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDeferredAction(1000));

    act(() =>
      result.current.defer({
        message: 'Deleting playlist',
        detail: 'A',
        commit: vi.fn()
      })
    );
    act(() =>
      result.current.defer({
        message: 'Deleting playlist',
        detail: 'A',
        commit: vi.fn()
      })
    );

    expect(result.current.replaced).toBeNull();
  });
});
