import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useMediaQuery } from './useMediaQuery';

function stubMatchMedia(matches: boolean): {
  readonly fire: (value: boolean) => void;
  readonly restore: () => void;
} {
  const original = window.matchMedia;
  let listener: ((event: MediaQueryListEvent) => void) | null = null;

  window.matchMedia = (query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: (
        _type: string,
        handler: EventListenerOrEventListenerObject
      ) => {
        listener = handler as (event: MediaQueryListEvent) => void;
      },
      removeEventListener: () => {
        listener = null;
      },
      dispatchEvent: () => false
    }) as MediaQueryList;

  return {
    fire: (value: boolean) => {
      listener?.({ matches: value } as MediaQueryListEvent);
    },
    restore: () => {
      window.matchMedia = original;
    }
  };
}

describe('useMediaQuery', () => {
  it('reports the query on mount', () => {
    const stub = stubMatchMedia(true);

    try {
      const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));

      expect(result.current).toBe(true);
    } finally {
      stub.restore();
    }
  });

  it('follows a change to the query', () => {
    const stub = stubMatchMedia(false);

    try {
      const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));

      expect(result.current).toBe(false);

      act(() => stub.fire(true));

      expect(result.current).toBe(true);
    } finally {
      stub.restore();
    }
  });

  it('reports false when the host has no matchMedia', () => {
    const original = window.matchMedia;
    delete (window as { matchMedia?: unknown }).matchMedia;

    try {
      const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));

      expect(result.current).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });
});
