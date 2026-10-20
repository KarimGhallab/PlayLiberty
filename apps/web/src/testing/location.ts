import { vi } from 'vitest';

/*
 * `location.assign` is a non-writable own property, so it cannot be spied in
 * place: the whole object is replaced instead.
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
