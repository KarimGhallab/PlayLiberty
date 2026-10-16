import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import LoadMoreControl from './LoadMoreControl';
import type { LoadMoreControlProps } from './LoadMoreControl';

/*
 * A stand-in for the platform observer, so the sentinel's wiring is exercised
 * without a real layout engine; jsdom has no `IntersectionObserver`.
 */
class FakeIntersectionObserver implements IntersectionObserver {
  static readonly instances: FakeIntersectionObserver[] = [];
  readonly root: Element | Document | null = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  readonly scrollMargin = '';
  private readonly _callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this._callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  enter(): void {
    const rect = new DOMRect(0, 0, 0, 0);

    this._callback(
      [
        {
          boundingClientRect: rect,
          intersectionRatio: 1,
          intersectionRect: rect,
          isIntersecting: true,
          rootBounds: rect,
          target: document.createElement('div'),
          time: 0
        }
      ],
      this
    );
  }
}

function renderControl(overrides: Partial<LoadMoreControlProps> = {}) {
  const onLoadMore = vi.fn();

  render(
    <I18nProvider preferred={['en']}>
      <LoadMoreControl
        loading={false}
        failed={false}
        onLoadMore={onLoadMore}
        {...overrides}
      />
    </I18nProvider>
  );

  return { onLoadMore };
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  FakeIntersectionObserver.instances.length = 0;
});

describe('LoadMoreControl', () => {
  it('loads the next page when the sentinel is reached', () => {
    const { onLoadMore } = renderControl();

    FakeIntersectionObserver.instances[0]?.enter();

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('loads the next page from its button', () => {
    const { onLoadMore } = renderControl();

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('reads as the retry when a page failed', () => {
    renderControl({ failed: true });

    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
  });
});
