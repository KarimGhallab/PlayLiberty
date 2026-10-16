import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './mocks/server';

/*
 * jsdom has no `matchMedia`, and the default answer is no preference, so the
 * tests exercise the animated path; a test wanting reduced motion overrides it.
 */
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
});

afterAll(() => server.close());
