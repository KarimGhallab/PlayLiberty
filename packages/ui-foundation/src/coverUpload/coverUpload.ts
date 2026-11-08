import {
  type CoverCrop,
  type CropFraming,
  clampPan,
  cropOf,
  maxZoom,
  shortEdge
} from '../coverCrop/coverCrop.js';

/* The upload rules the server enforces, mirrored here so the client can refuse
 * a file before it travels. The server stays the authority on normalisation. */
export const COVER_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
] as const;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_PAN_STEP = 0.05;
export const COVER_ZOOM_STEP = 0.1;

const ACCEPTED_TYPES = new Set<string>(COVER_ACCEPTED_TYPES);

export type CoverUploadVerdict = 'wrong-type' | 'too-large';

export interface CoverFileFacts {
  readonly contentType: string;
  readonly size: number;
}

export interface CoverFile<TFile> extends CoverFileFacts {
  /** The platform's file handle, sent to the API unchanged. */
  readonly file: TFile;
}

export interface CoverSize {
  readonly width: number;
  readonly height: number;
}

export interface CoverUploadBox {
  /** The painted box as a fraction of the square stage's edge. */
  readonly width: number;
  readonly height: number;
}

export interface CoverUploadState<TFile> {
  readonly chosen: CoverFile<TFile> | null;
  readonly natural: CoverSize | null;
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly verdict: CoverUploadVerdict | null;
  readonly confirmingDiscard: boolean;
  readonly confirmingRemove: boolean;
  readonly busy: boolean;
  readonly closeRequested: boolean;
}

export type CoverUploadAction<TFile> =
  | { readonly type: 'reset' }
  | { readonly type: 'choose'; readonly file: CoverFile<TFile> }
  | { readonly type: 'measured'; readonly size: CoverSize }
  | { readonly type: 'measureFailed' }
  | { readonly type: 'zoomTo'; readonly zoom: number }
  | { readonly type: 'zoomToRatio'; readonly ratio: number }
  | { readonly type: 'panBy'; readonly x: number; readonly y: number }
  | { readonly type: 'resetCrop' }
  | { readonly type: 'requestClose' }
  | { readonly type: 'cancelDiscard' }
  | { readonly type: 'requestRemove' }
  | { readonly type: 'cancelRemove' }
  | { readonly type: 'busy'; readonly busy: boolean }
  | { readonly type: 'submitted' }
  | { readonly type: 'removed' }
  | { readonly type: 'closed' };

export interface CoverUploadSubmission<TFile> {
  readonly file: CoverFile<TFile>;
  readonly crop: CoverCrop | null;
}

/** The verdict on one picked file, before the surface creates a preview. */
export function coverUploadVerdict(
  file: CoverFileFacts
): CoverUploadVerdict | null {
  if (!ACCEPTED_TYPES.has(file.contentType)) {
    return 'wrong-type';
  }

  if (file.size > COVER_MAX_BYTES) {
    return 'too-large';
  }

  return null;
}

export function coverUploadInitial<TFile>(): CoverUploadState<TFile> {
  return {
    chosen: null,
    natural: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    verdict: null,
    confirmingDiscard: false,
    confirmingRemove: false,
    busy: false,
    closeRequested: false
  };
}

function zoomMaxOf(state: CoverUploadState<unknown>): number {
  return state.natural === null
    ? 1
    : maxZoom(state.natural.width, state.natural.height);
}

function framed<TFile>(
  state: CoverUploadState<TFile>,
  zoom: number
): CoverUploadState<TFile> {
  const natural = state.natural;

  if (natural === null) {
    return state;
  }

  const next = Math.min(zoomMaxOf(state), Math.max(1, zoom));
  const clamped = clampPan({
    naturalWidth: natural.width,
    naturalHeight: natural.height,
    zoom: next,
    panX: state.panX,
    panY: state.panY
  });

  if (
    clamped.zoom === state.zoom &&
    clamped.panX === state.panX &&
    clamped.panY === state.panY
  ) {
    return state;
  }

  return {
    ...state,
    zoom: clamped.zoom,
    panX: clamped.panX,
    panY: clamped.panY
  };
}

function withPan<TFile>(
  state: CoverUploadState<TFile>,
  x: number,
  y: number
): CoverUploadState<TFile> {
  const natural = state.natural;

  if (natural === null) {
    return state;
  }

  const framing: CropFraming = {
    naturalWidth: natural.width,
    naturalHeight: natural.height,
    zoom: state.zoom,
    panX: state.panX + x,
    panY: state.panY + y
  };
  const clamped = clampPan(framing);

  if (clamped.panX === state.panX && clamped.panY === state.panY) {
    return state;
  }

  return { ...state, panX: clamped.panX, panY: clamped.panY };
}

export function reduceCoverUpload<TFile>(
  state: CoverUploadState<TFile>,
  action: CoverUploadAction<TFile>
): CoverUploadState<TFile> {
  if (action.type === 'reset') {
    return coverUploadInitial<TFile>();
  }

  if (action.type === 'busy') {
    return state.busy === action.busy ? state : { ...state, busy: action.busy };
  }

  if (action.type === 'submitted') {
    return { ...coverUploadInitial<TFile>(), busy: state.busy };
  }

  if (action.type === 'closed') {
    return state.closeRequested ? { ...state, closeRequested: false } : state;
  }

  if (action.type === 'measured') {
    return { ...state, natural: action.size };
  }

  if (action.type === 'measureFailed') {
    return { ...state, natural: null, zoom: 1, panX: 0, panY: 0 };
  }

  if (action.type === 'choose') {
    if (state.busy) {
      return state;
    }

    const verdict = coverUploadVerdict(action.file);

    if (verdict !== null) {
      return { ...state, verdict };
    }

    return {
      ...state,
      chosen: action.file,
      natural: null,
      zoom: 1,
      panX: 0,
      panY: 0,
      verdict: null
    };
  }

  if (action.type === 'zoomTo') {
    return state.busy ? state : framed(state, action.zoom);
  }

  if (action.type === 'zoomToRatio') {
    if (state.busy) {
      return state;
    }

    const ratio = Math.min(1, Math.max(0, action.ratio));

    return framed(state, 1 + (zoomMaxOf(state) - 1) * ratio);
  }

  if (action.type === 'panBy') {
    return state.busy ? state : withPan(state, action.x, action.y);
  }

  if (action.type === 'resetCrop') {
    if (state.busy || (state.zoom === 1 && state.panX === 0 && state.panY === 0)) {
      return state;
    }

    return { ...state, zoom: 1, panX: 0, panY: 0 };
  }

  if (action.type === 'requestClose') {
    if (state.busy) {
      return state;
    }

    if (state.confirmingRemove) {
      return { ...state, confirmingRemove: false };
    }

    if (state.confirmingDiscard) {
      return { ...state, confirmingDiscard: false };
    }

    if (state.chosen !== null) {
      return { ...state, confirmingDiscard: true };
    }

    return { ...state, closeRequested: true };
  }

  if (action.type === 'cancelDiscard') {
    return state.confirmingDiscard
      ? { ...state, confirmingDiscard: false }
      : state;
  }

  if (action.type === 'requestRemove') {
    if (state.busy || state.confirmingRemove) {
      return state;
    }

    return {
      ...state,
      confirmingRemove: true,
      confirmingDiscard: false
    };
  }

  if (action.type === 'cancelRemove') {
    if (state.busy || !state.confirmingRemove) {
      return state;
    }

    return { ...state, confirmingRemove: false };
  }

  if (action.type === 'removed') {
    return state.confirmingRemove
      ? { ...state, confirmingRemove: false }
      : state;
  }

  return state;
}

export function coverUploadBox(
  state: CoverUploadState<unknown>
): CoverUploadBox | null {
  const natural = state.natural;

  if (natural === null) {
    return null;
  }

  const edge = shortEdge(natural.width, natural.height);

  return {
    width: natural.width / edge,
    height: natural.height / edge
  };
}

export function coverUploadZoomMax(
  state: CoverUploadState<unknown>
): number {
  return zoomMaxOf(state);
}

export function coverUploadZoomRatio(
  state: CoverUploadState<unknown>
): number {
  const max = coverUploadZoomMax(state);

  return max <= 1 ? 0 : ((state.zoom - 1) / (max - 1)) * 100;
}

export function coverUploadAdjusted(
  state: CoverUploadState<unknown>
): boolean {
  return state.zoom !== 1 || state.panX !== 0 || state.panY !== 0;
}

export function coverUploadCrop(
  state: CoverUploadState<unknown>
): CoverCrop | null {
  const natural = state.natural;

  if (natural === null || !coverUploadAdjusted(state)) {
    return null;
  }

  return cropOf({
    naturalWidth: natural.width,
    naturalHeight: natural.height,
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY
  });
}

export function coverUploadSubmission<TFile>(
  state: CoverUploadState<TFile>
): CoverUploadSubmission<TFile> | null {
  if (state.busy || state.chosen === null) {
    return null;
  }

  return { file: state.chosen, crop: coverUploadCrop(state) };
}

export function coverUploadStageReady(
  state: CoverUploadState<unknown>
): boolean {
  return state.chosen !== null && state.natural !== null;
}
