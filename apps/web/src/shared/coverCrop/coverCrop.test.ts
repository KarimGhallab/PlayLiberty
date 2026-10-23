import { describe, expect, it } from 'vitest';

import { clampPan, cropOf, maxZoom, panLimits } from './coverCrop';

/* A landscape source whose short edge is the height, and its portrait twin, so
 * a case names its axis by the fixture. */
const LANDSCAPE = { naturalWidth: 900, naturalHeight: 300 };

describe('the crop the dialog shows', () => {
  it('keeps the centered square of a landscape source at 1x', () => {
    const crop = cropOf({ ...LANDSCAPE, zoom: 1, panX: 0, panY: 0 });

    expect(crop.x).toBeCloseTo(1 / 3);
    expect(crop.y).toBeCloseTo(0);
    expect(crop.width).toBeCloseTo(1 / 3);
    expect(crop.height).toBeCloseTo(1);
  });

  it('keeps the centered square of a portrait source at 1x', () => {
    const crop = cropOf({
      naturalWidth: 300,
      naturalHeight: 900,
      zoom: 1,
      panX: 0,
      panY: 0
    });

    expect(crop.x).toBeCloseTo(0);
    expect(crop.y).toBeCloseTo(1 / 3);
    expect(crop.width).toBeCloseTo(1);
    expect(crop.height).toBeCloseTo(1 / 3);
  });

  it('shrinks the visible square as the image zooms', () => {
    const crop = cropOf({ ...LANDSCAPE, zoom: 2, panX: 0, panY: 0 });

    expect(crop.width).toBeCloseTo(1 / 6);
    expect(crop.height).toBeCloseTo(1 / 2);
    expect(crop.x).toBeCloseTo(5 / 12);
    expect(crop.y).toBeCloseTo(1 / 4);
  });

  it('moves the visible square against the pan', () => {
    const crop = cropOf({ ...LANDSCAPE, zoom: 2, panX: 0.2, panY: 0 });

    expect(crop.x).toBeCloseTo(23 / 60);
    expect(crop.y).toBeCloseTo(1 / 4);
  });

  it('reveals the far side when the image is dragged at 1x', () => {
    const crop = cropOf({ ...LANDSCAPE, zoom: 1, panX: -1, panY: 0 });

    expect(crop.x).toBeCloseTo(2 / 3);
    expect(crop.width).toBeCloseTo(1 / 3);
  });

  it('caps the pan so no empty edge shows', () => {
    expect(panLimits(900, 300, 1)).toEqual({ x: 1, y: 0 });
    expect(panLimits(900, 300, 2)).toEqual({ x: 2.5, y: 0.5 });

    const clamped = clampPan({
      ...LANDSCAPE,
      zoom: 2,
      panX: 999,
      panY: -999
    });

    expect(clamped.panX).toBe(2.5);
    expect(clamped.panY).toBe(-0.5);
  });

  it('lands on the image edge when the pan is at its limit', () => {
    expect(cropOf({ ...LANDSCAPE, zoom: 2, panX: 2.5, panY: 0 }).x).toBeCloseTo(
      0
    );
    expect(
      cropOf({ ...LANDSCAPE, zoom: 2, panX: -2.5, panY: 0 }).x
    ).toBeCloseTo(5 / 6);
  });

  it('rounds a pan past the edge back inside the image', () => {
    const crop = cropOf({ ...LANDSCAPE, zoom: 2, panX: 99, panY: -99 });

    expect(crop.x).toBeCloseTo(0);
    expect(crop.y).toBeCloseTo(1 / 2);
  });
});

describe('the zoom range', () => {
  it('never goes below 1x for a source under 640px', () => {
    expect(maxZoom(320, 320)).toBe(1);
    expect(maxZoom(640, 640)).toBe(1);
  });

  it('scales with the short edge until the 3x ceiling', () => {
    expect(maxZoom(1000, 800)).toBe(1.25);
    expect(maxZoom(2000, 1000)).toBe(1.5625);
    expect(maxZoom(4000, 2000)).toBe(3);
    expect(maxZoom(8000, 6000)).toBe(3);
  });
});
