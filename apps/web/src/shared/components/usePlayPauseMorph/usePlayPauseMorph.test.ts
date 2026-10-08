import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePlayPauseMorph } from './usePlayPauseMorph';

describe('usePlayPauseMorph', () => {
  it('rests until playback changes, then plays forward and clears', () => {
    const { result, rerender } = renderHook(
      ({ playing }: { playing: boolean }) => usePlayPauseMorph(playing),
      { initialProps: { playing: false } }
    );

    expect(result.current.run).toBeUndefined();

    rerender({ playing: true });
    expect(result.current.run).toBe('');

    act(() => result.current.endRun());
    expect(result.current.run).toBeUndefined();
  });

  it('plays reverse when playback stops', () => {
    const { result, rerender } = renderHook(
      ({ playing }: { playing: boolean }) => usePlayPauseMorph(playing),
      { initialProps: { playing: true } }
    );

    expect(result.current.run).toBeUndefined();

    rerender({ playing: false });
    expect(result.current.run).toBe('reverse');
  });
});
