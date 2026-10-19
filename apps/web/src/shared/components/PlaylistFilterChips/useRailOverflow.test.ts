import { describe, expect, it } from 'vitest';

import { RailOverflow, overflowOf } from './useRailOverflow';

describe('overflowOf', () => {
  it('names the edges that still hide a chip', () => {
    expect(overflowOf(0, 692, 563)).toBe(RailOverflow.End);
    expect(overflowOf(129, 692, 563)).toBe(RailOverflow.Start);
    expect(overflowOf(40, 692, 563)).toBe(RailOverflow.Both);
  });

  it('claims nothing when the rail fits', () => {
    expect(overflowOf(0, 563, 563)).toBe(RailOverflow.None);
  });

  it('reads a fractional edge as the edge it is', () => {
    expect(overflowOf(0.5, 692, 563)).toBe(RailOverflow.End);
    expect(overflowOf(128.5, 692, 563)).toBe(RailOverflow.Start);
  });
});
