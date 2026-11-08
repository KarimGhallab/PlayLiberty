import { describe, expect, it } from 'vitest';

import {
  COVER_MAX_BYTES,
  COVER_ZOOM_STEP,
  coverUploadBox,
  coverUploadCrop,
  coverUploadInitial,
  coverUploadStageReady,
  coverUploadSubmission,
  coverUploadZoomMax,
  coverUploadZoomRatio,
  reduceCoverUpload
} from './coverUpload.js';

const LANDSCAPE = { width: 2000, height: 1000 };

function image(
  contentType = 'image/jpeg',
  size = 1024
): { file: string; contentType: string; size: number } {
  return { file: 'cover.jpg', contentType, size };
}

function chosen() {
  return reduceCoverUpload(coverUploadInitial<string>(), {
    type: 'choose',
    file: image()
  });
}

function withNatural() {
  return reduceCoverUpload(chosen(), { type: 'measured', size: LANDSCAPE });
}

describe('choosing a cover file', () => {
  it('refuses a type the server does not accept', () => {
    const state = reduceCoverUpload(coverUploadInitial<string>(), {
      type: 'choose',
      file: image('image/gif')
    });

    expect(state.chosen).toBeNull();
    expect(state.verdict).toBe('wrong-type');
  });

  it('refuses a file over the server limit', () => {
    const state = reduceCoverUpload(coverUploadInitial<string>(), {
      type: 'choose',
      file: image('image/jpeg', COVER_MAX_BYTES + 1)
    });

    expect(state.chosen).toBeNull();
    expect(state.verdict).toBe('too-large');
  });

  it('accepts a JPEG, a PNG and a WebP at the limit', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      const state = reduceCoverUpload(coverUploadInitial<string>(), {
        type: 'choose',
        file: image(type, COVER_MAX_BYTES)
      });

      expect(state.chosen?.contentType).toBe(type);
      expect(state.verdict).toBeNull();
    }
  });

  it('starts a new image at 1x with no framing', () => {
    const zoomed = reduceCoverUpload(withNatural(), {
      type: 'zoomTo',
      zoom: 1.4
    });
    const state = reduceCoverUpload(zoomed, {
      type: 'choose',
      file: image()
    });

    expect(state.zoom).toBe(1);
    expect(state.panX).toBe(0);
    expect(state.panY).toBe(0);
    expect(state.natural).toBeNull();
  });

  it('keeps the chosen image when the next file is refused', () => {
    const state = reduceCoverUpload(chosen(), {
      type: 'choose',
      file: image('image/gif')
    });

    expect(state.chosen?.file).toBe('cover.jpg');
    expect(state.verdict).toBe('wrong-type');
  });
});

describe('framing the chosen image', () => {
  it('reads the natural size into the box and the zoom range', () => {
    const state = withNatural();

    expect(coverUploadBox(state)).toEqual({ width: 2, height: 1 });
    expect(coverUploadZoomMax(state)).toBeCloseTo(1.5625);
  });

  it('clamps the zoom between 1x and the short-edge ceiling', () => {
    const low = reduceCoverUpload(withNatural(), {
      type: 'zoomTo',
      zoom: 0.2
    });
    const high = reduceCoverUpload(withNatural(), {
      type: 'zoomTo',
      zoom: 9
    });

    expect(low.zoom).toBe(1);
    expect(high.zoom).toBeCloseTo(1.5625);
  });

  it('clamps the pan after zooming out', () => {
    const zoomed = reduceCoverUpload(withNatural(), {
      type: 'zoomTo',
      zoom: 1.5
    });
    const panned = reduceCoverUpload(zoomed, {
      type: 'panBy',
      x: 0.9,
      y: 0
    });
    const back = reduceCoverUpload(panned, {
      type: 'zoomTo',
      zoom: 1
    });

    expect(panned.panX).toBeCloseTo(0.9);
    expect(back.panX).toBeCloseTo(0.5);
    expect(back.panY).toBe(0);
  });

  it('maps a rail ratio to the zoom range', () => {
    const state = reduceCoverUpload(withNatural(), {
      type: 'zoomToRatio',
      ratio: 0.5
    });

    expect(state.zoom).toBeCloseTo(1.28125);
  });

  it('reads the ratio back from the zoom', () => {
    const state = reduceCoverUpload(withNatural(), {
      type: 'zoomTo',
      zoom: 1.28125
    });

    expect(coverUploadZoomRatio(state)).toBeCloseTo(50);
  });

  it('shows no ratio while the image cannot zoom', () => {
    const state = reduceCoverUpload(coverUploadInitial<string>(), {
      type: 'measured',
      size: { width: 320, height: 320 }
    });

    expect(coverUploadZoomRatio(state)).toBe(0);
  });

  it('resets the framing to 1x and the centre', () => {
    const zoomed = reduceCoverUpload(withNatural(), {
      type: 'zoomTo',
      zoom: 1.4
    });
    const state = reduceCoverUpload(zoomed, { type: 'resetCrop' });

    expect(state.zoom).toBe(1);
    expect(state.panX).toBe(0);
    expect(state.panY).toBe(0);
  });

  it('steps the zoom by the shared step', () => {
    const state = reduceCoverUpload(withNatural(), {
      type: 'zoomTo',
      zoom: 1 + COVER_ZOOM_STEP
    });

    expect(state.zoom).toBeCloseTo(1.1);
  });

  it('clears the natural size when the measurement fails', () => {
    const state = reduceCoverUpload(withNatural(), {
      type: 'measureFailed'
    });

    expect(state.natural).toBeNull();
    expect(coverUploadBox(state)).toBeNull();
  });
});

describe('closing and confirming', () => {
  it('closes a clean surface', () => {
    const state = reduceCoverUpload(coverUploadInitial<string>(), {
      type: 'requestClose'
    });

    expect(state.closeRequested).toBe(true);
  });

  it('asks before discarding a chosen image', () => {
    const asked = reduceCoverUpload(chosen(), { type: 'requestClose' });
    const kept = reduceCoverUpload(asked, { type: 'cancelDiscard' });

    expect(asked.confirmingDiscard).toBe(true);
    expect(asked.closeRequested).toBe(false);
    expect(kept.confirmingDiscard).toBe(false);
  });

  it('asks before removing and cancels the discard question', () => {
    const asked = reduceCoverUpload(chosen(), { type: 'requestClose' });
    const removing = reduceCoverUpload(asked, { type: 'requestRemove' });

    expect(removing.confirmingRemove).toBe(true);
    expect(removing.confirmingDiscard).toBe(false);
  });

  it('refuses every close request while busy', () => {
    const busy = reduceCoverUpload(chosen(), { type: 'busy', busy: true });
    const state = reduceCoverUpload(busy, { type: 'requestClose' });

    expect(state.closeRequested).toBe(false);
    expect(state.confirmingDiscard).toBe(false);
  });

  it('refuses a remove request while busy', () => {
    const busy = reduceCoverUpload(chosen(), { type: 'busy', busy: true });
    const state = reduceCoverUpload(busy, { type: 'requestRemove' });

    expect(state.confirmingRemove).toBe(false);
  });
});

describe('the submission', () => {
  it('sends no crop at 1x and the centred frame', () => {
    const state = withNatural();
    const submission = coverUploadSubmission(state);

    expect(submission?.file.file).toBe('cover.jpg');
    expect(submission?.crop).toBeNull();
  });

  it('sends the four fractions of a moved stage', () => {
    const state = reduceCoverUpload(withNatural(), {
      type: 'zoomTo',
      zoom: 1.5
    });
    const crop = coverUploadCrop(state);

    expect(crop?.width).toBeCloseTo(1 / 3);
    expect(crop?.height).toBeCloseTo(2 / 3);
    expect(crop?.x).toBeGreaterThanOrEqual(0);
    expect(crop?.y).toBeGreaterThanOrEqual(0);
    expect(coverUploadSubmission(state)?.crop).toEqual(crop);
  });

  it('sends nothing while busy or before a file is chosen', () => {
    const busy = reduceCoverUpload(withNatural(), {
      type: 'busy',
      busy: true
    });

    expect(coverUploadSubmission(busy)).toBeNull();
    expect(coverUploadSubmission(coverUploadInitial<string>())).toBeNull();
  });

  it('clears the chosen image after a successful save', () => {
    const state = reduceCoverUpload(withNatural(), { type: 'submitted' });

    expect(state.chosen).toBeNull();
    expect(state.natural).toBeNull();
    expect(state.zoom).toBe(1);
    expect(state.verdict).toBeNull();
  });

  it('clears the remove confirmation after a successful removal', () => {
    const removing = reduceCoverUpload(chosen(), { type: 'requestRemove' });
    const state = reduceCoverUpload(removing, { type: 'removed' });

    expect(state.confirmingRemove).toBe(false);
  });
});

describe('the stage state', () => {
  it('is ready once the chosen file is measured', () => {
    expect(coverUploadStageReady(coverUploadInitial<string>())).toBe(false);
    expect(coverUploadStageReady(chosen())).toBe(false);
    expect(coverUploadStageReady(withNatural())).toBe(true);
  });
});
