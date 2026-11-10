import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { resetDeferredActions } from '@playliberty/library';

/* The resolved transport, so a test that mounts a hook has a client to send
 * through. */
import { configureWebApiClient } from '../shared/api/transport';

import { server } from './mocks/server';

configureWebApiClient();

/*
 * jsdom has no `matchMedia`, and the default answer is no preference, so the
 * tests exercise the animated path; a test wanting reduced motion overrides it.
 */
/* jsdom's object URL cannot take its own `File`; a preview only needs a
 * stable string to draw. */
URL.createObjectURL = () => 'blob:test-preview';
URL.revokeObjectURL = () => undefined;

/* TanStack Router scrolls to the top after every rendered route; jsdom's
 * `scrollTo` is an unimplemented stub that logs each call. */
Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  writable: true,
  value: () => undefined
});

/* The player resets its media element with `load()`; jsdom only logs that it
 * is unimplemented. */
Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
  configurable: true,
  writable: true,
  value: () => undefined
});

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

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetDeferredActions();
});

afterAll(() => server.close());
