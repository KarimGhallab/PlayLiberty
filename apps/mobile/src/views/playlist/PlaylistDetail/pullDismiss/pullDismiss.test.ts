import { describe, expect, it } from '@jest/globals';

import { claimsPull, commitsPull } from './pullDismiss';

const HEADER_BOTTOM = 250;

function claim(overrides: Partial<Parameters<typeof claimsPull>[0]> = {}) {
  return claimsPull({
    dx: 0,
    dy: 40,
    offset: 0,
    startY: 400,
    headerBottom: HEADER_BOTTOM,
    ...overrides
  });
}

describe('the pull that leaves the detail', () => {
  it('claims a downward pull at the top of the list', () => {
    expect(claim()).toBe(true);
  });

  it('leaves a scrolled list to the list', () => {
    expect(claim({ offset: 480 })).toBe(false);
  });

  it('claims a pull that starts on the header at any scroll position', () => {
    expect(claim({ offset: 480, startY: 120 })).toBe(true);
  });

  it('leaves upward and sideways gestures to their owners', () => {
    expect(claim({ dy: -40 })).toBe(false);
    expect(claim({ dx: 80, dy: 40 })).toBe(false);
  });

  it('ignores a thumb that barely moved', () => {
    expect(claim({ dy: 6 })).toBe(false);
  });

  it('commits a long pull, a flick, and nothing less', () => {
    expect(commitsPull(140, 0.1)).toBe(true);
    expect(commitsPull(30, 0.9)).toBe(true);
    expect(commitsPull(60, 0.1)).toBe(false);
    expect(commitsPull(12, 0.9)).toBe(false);
  });
});
