import { vi } from 'vitest';

/*
 * jsdom's `location.assign` is a non-writable own property, so it cannot be
 * spied in place. The whole `location` object can be replaced, which is what the
 * re-authentication guard's test needs: it asserts the navigation happened
 * without letting jsdom attempt it.
 */
const originalLocation = window.location;

export function stubLocationAssign() {
  const assign = vi.fn();

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: originalLocation.href, assign }
  });

  return assign;
}

export function restoreLocation(): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation
  });
}
