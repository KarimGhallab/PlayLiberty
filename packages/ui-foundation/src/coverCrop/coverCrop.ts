/*
 * The square the dialog shows, as fractions of the source image. Everything is
 * dimensionless: pan is a fraction of the stage's width, so the math needs no
 * layout and stays the same at any rendered size.
 */

export interface CoverCrop {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CropFraming {
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export interface PanLimits {
  readonly x: number;
  readonly y: number;
}

/* 640 source pixels across the stage at the top of the range, so a stored
 * square is never one the server would have to enlarge. */
const SMALLEST_STORED_EDGE = 640;
const ZOOM_CEILING = 3;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** The edge a square crop is bounded by. */
export function shortEdge(naturalWidth: number, naturalHeight: number): number {
  return Math.min(naturalWidth, naturalHeight);
}

/* A short edge below 640 gives no headroom, so the slider is dead for such an
 * image rather than storing a soft square. */
export function maxZoom(naturalWidth: number, naturalHeight: number): number {
  const edge = shortEdge(naturalWidth, naturalHeight);

  return clamp(edge / SMALLEST_STORED_EDGE, 1, ZOOM_CEILING);
}

/* How far the image can travel from centre before an empty edge would show,
 * in stage widths. At 1x the image covers the stage exactly, so it is zero. */
export function panLimits(
  naturalWidth: number,
  naturalHeight: number,
  zoom: number
): PanLimits {
  const edge = shortEdge(naturalWidth, naturalHeight);

  return {
    x: Math.max(0, (naturalWidth / edge) * zoom - 1) / 2,
    y: Math.max(0, (naturalHeight / edge) * zoom - 1) / 2
  };
}

export function clampPan(framing: CropFraming): CropFraming {
  const limits = panLimits(
    framing.naturalWidth,
    framing.naturalHeight,
    framing.zoom
  );

  return {
    ...framing,
    panX: clamp(framing.panX, -limits.x, limits.x),
    panY: clamp(framing.panY, -limits.y, limits.y)
  };
}

export function cropOf(framing: CropFraming): CoverCrop {
  const edge = shortEdge(framing.naturalWidth, framing.naturalHeight);
  const shownWidth = (framing.naturalWidth / edge) * framing.zoom;
  const shownHeight = (framing.naturalHeight / edge) * framing.zoom;
  const width = 1 / shownWidth;
  const height = 1 / shownHeight;

  return {
    x: clamp((1 - width) / 2 - framing.panX / shownWidth, 0, 1 - width),
    y: clamp((1 - height) / 2 - framing.panY / shownHeight, 0, 1 - height),
    width,
    height
  };
}

/** The readout, one decimal so a small nudge is visible. */
export function formatZoom(zoom: number): string {
  return `${zoom.toFixed(1)}x`;
}
