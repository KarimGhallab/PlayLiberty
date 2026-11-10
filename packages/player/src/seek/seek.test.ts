import { describe, expect, it } from 'vitest';

import { seekFractionPatch, seekPatch } from './seek.js';

describe('seekPatch', () => {
  it('clamps a seek at both ends', () => {
    expect(seekPatch(120, -5)).toEqual({
      positionSeconds: 0,
      seekTo: 0
    });
    expect(seekPatch(120, 500)).toEqual({
      positionSeconds: 120,
      seekTo: 120
    });
  });

  it('refuses a seek with no duration', () => {
    expect(seekPatch(null, 30)).toBeNull();
    expect(seekPatch(0, 30)).toBeNull();
  });

  it('refuses a non-finite target', () => {
    expect(seekPatch(120, Number.NaN)).toBeNull();
  });
});

describe('seekFractionPatch', () => {
  it('moves to the fraction of the duration', () => {
    expect(seekFractionPatch(200, 0.25)).toEqual({
      positionSeconds: 50,
      seekTo: 50
    });
  });

  it('clamps the fraction and refuses a missing duration', () => {
    expect(seekFractionPatch(200, 2)).toEqual({
      positionSeconds: 200,
      seekTo: 200
    });
    expect(seekFractionPatch(null, 0.5)).toBeNull();
  });
});
