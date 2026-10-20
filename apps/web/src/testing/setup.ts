import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { resetDeferredActions } from '../shared/components/useDeferredAction/deferredActionStore';

import { server } from './mocks/server';

/*
 * jsdom has no `matchMedia`, and the default answer is no preference, so the
 * tests exercise the animated path; a test wanting reduced motion overrides it.
 */
/* jsdom's object URL cannot take its own `File`; a preview only needs a
 * stable string to draw. */
URL.createObjectURL = () => 'blob:test-preview';
URL.revokeObjectURL = () => undefined;

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    }) as MediaQueryList;
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetDeferredActions();
});

afterAll(() => server.close());
