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
});
