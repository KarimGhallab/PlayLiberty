import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Playlist } from '@playliberty/contracts';
import {
  PlaylistSort,
  PlaylistSyncStatus,
  Provider
} from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';
import type { CoverCrop } from '@playliberty/ui-foundation';

import CoverDialog from './CoverDialog';

const CUSTOM_VERSION = '2026-10-20T12:00:00.000Z';
const createObjectURL = vi.fn(() => 'blob:cover-preview');
const revokeObjectURL = vi.fn();

class TestUrl extends URL {
  static createObjectURL = createObjectURL;
  static revokeObjectURL = revokeObjectURL;
}

beforeEach(() => {
  vi.stubGlobal('URL', TestUrl);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function playlist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'playlist-1',
    ownerAccountId: 'account-1',
    name: 'Rain On The Window',
    coverTrackId: null,
    coverUpdatedAt: null,
    provider: Provider.Youtube,
    sourcePlaylistId: 'PL-demo',
    syncStatus: PlaylistSyncStatus.Idle,
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 128,
    skipNonMusic: true,
    sort: PlaylistSort.Playlist,
    access: 'owner',
    hasShares: false,
    pinned: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z',
    ...overrides
  };
}

function coveredPlaylist(trackId: string | null = null): Playlist {
  return playlist({
    coverUpdatedAt: CUSTOM_VERSION,
    coverTrackId: trackId
  });
}

function imageFile(name = 'cover.jpg', type = 'image/jpeg', bytes = 8): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function dialogElement(props: Partial<Parameters<typeof CoverDialog>[0]> = {}) {
  return (
    <I18nProvider preferred={['en']}>
      <CoverDialog
        open
        playlist={playlist()}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        {...props}
      />
    </I18nProvider>
  );
}

function renderDialog(props: Partial<Parameters<typeof CoverDialog>[0]> = {}) {
  return render(dialogElement(props));
}

function choose(container: HTMLElement, file: File): void {
  const input = container.querySelector<HTMLInputElement>('input[type=file]');

  if (input === null) {
    throw new Error('the dialog has no file input');
  }

  fireEvent.change(input, { target: { files: [file] } });
}

/* jsdom never decodes an image, so the natural size the crop math reads is
 * declared here and the load event fired by hand. */
function loadChosen(
  container: HTMLElement,
  width = 2000,
  height = 1000
): HTMLImageElement {
  const picture = container.querySelector('img');

  if (picture === null) {
    throw new Error('the dialog shows no image');
  }

  Object.defineProperty(picture, 'naturalWidth', {
    value: width,
    configurable: true
  });
  Object.defineProperty(picture, 'naturalHeight', {
    value: height,
    configurable: true
  });
  fireEvent.load(picture);

  return picture;
}

function box(width: number, height: number) {
  return {
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    x: 0,
    y: 0,
    toJSON: () => ({})
  };
}

describe('CoverDialog', () => {
  it('opens on the labelled image button with the current custom cover', () => {
    const { container } = renderDialog({
      playlist: playlist({
        coverUpdatedAt: CUSTOM_VERSION,
        coverTrackId: 'track-9'
      })
    });

    expect(
      screen.getByRole('dialog', { name: 'Playlist cover' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose image' })).toHaveFocus();
    expect(
      screen.getByText('JPEG, PNG or WebP, up to 5 MB.')
    ).toBeInTheDocument();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      `/api/v1/playlists/playlist-1/cover?v=${encodeURIComponent(CUSTOM_VERSION)}`
    );
  });

  it('opens the file picker from the labelled button', () => {
    const openPicker = vi.spyOn(HTMLInputElement.prototype, 'click');
    const { container } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Choose image' }));

    expect(openPicker).toHaveBeenCalledTimes(1);
    expect(container.querySelector('input[type=file]')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp'
    );
  });

  it('keeps the hidden file input out of the focus loop', () => {
    renderDialog();

    const choose = screen.getByRole('button', { name: 'Choose image' });
    choose.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('previews a chosen file, holds Save until then, and submits it', () => {
    const onSubmit = vi.fn();
    const { container } = renderDialog({ onSubmit });
    const save = screen.getByRole('button', { name: 'Save' });
    const file = imageFile();

    expect(save).toBeDisabled();

    choose(container, file);

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'blob:cover-preview'
    );
    expect(save).toBeEnabled();

    fireEvent.click(save);

    expect(onSubmit).toHaveBeenCalledWith(file, null);
  });

  it('accepts a dropped image through the square', () => {
    const { container } = renderDialog();
    const drop = container.querySelector('[data-cover-drop]');

    if (drop === null) {
      throw new Error('the dialog has no drop target');
    }

    fireEvent.drop(drop, { dataTransfer: { files: [imageFile()] } });

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'blob:cover-preview'
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('refuses a wrong type with its own sentence and no submission', () => {
    const onSubmit = vi.fn();
    const { container } = renderDialog({ onSubmit });

    choose(container, imageFile('cover.gif', 'image/gif'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose a JPEG, PNG or WebP image.'
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses an image over 5 MB with its own sentence and no submission', () => {
    const onSubmit = vi.fn();
    const { container } = renderDialog({ onSubmit });

    choose(container, imageFile('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose an image smaller than 5 MB.'
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('reports a busy save and refuses every close path while busy', () => {
    const onClose = vi.fn();
    const { container } = renderDialog({ isWorking: true, onClose });

    const save = screen.getByRole('button', { name: 'Saving' });
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.mouseDown(
      screen.getByRole('dialog').parentElement as HTMLElement
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(container.querySelector('input[type=file]')).toBeDisabled();
  });

  it('keeps the dialog open with one sentence when the save fails', () => {
    renderDialog({
      problem: 'The cover could not be saved.'
    });

    expect(
      screen.getByRole('dialog', { name: 'Playlist cover' })
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The cover could not be saved.'
    );
  });

  it('offers Remove only while a custom cover exists', () => {
    const covered = renderDialog({
      playlist: coveredPlaylist(),
      onRemove: vi.fn()
    });

    expect(
      screen.getByRole('button', { name: 'Remove cover' })
    ).toBeInTheDocument();
    covered.unmount();

    renderDialog({ playlist: playlist(), onRemove: vi.fn() });

    expect(
      screen.queryByRole('button', { name: 'Remove cover' })
    ).not.toBeInTheDocument();
  });

  it('keeps Remove available when the custom image fails', () => {
    const { container } = renderDialog({
      playlist: coveredPlaylist(),
      onRemove: vi.fn()
    });

    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Remove cover' })
    ).toBeInTheDocument();
  });

  it('asks once before removing, previews the first track, and Cancel returns', () => {
    const onRemove = vi.fn();
    const { container } = renderDialog({
      playlist: coveredPlaylist('track-9'),
      onRemove
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove cover' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Remove the custom cover? The playlist will use its first track's cover."
    );
    expect(onRemove).not.toHaveBeenCalled();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/api/v1/tracks/track-9/thumbnail'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      `/api/v1/playlists/playlist-1/cover?v=${encodeURIComponent(CUSTOM_VERSION)}`
    );
    expect(
      screen.getByRole('button', { name: 'Remove cover' })
    ).toBeInTheDocument();
  });

  it('previews the sleeve when there is no first track to fall back to', () => {
    const { container } = renderDialog({
      playlist: coveredPlaylist(),
      onRemove: vi.fn()
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove cover' }));

    expect(container.querySelector('img')).toBeNull();
    expect(
      container.querySelector('[data-cover-drop]')?.getAttribute('data-art')
    ).toBe('no-art');
  });

  it('falls back to the sleeve when the previewed track image fails', () => {
    const { container } = renderDialog({
      playlist: coveredPlaylist('track-9'),
      onRemove: vi.fn()
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove cover' }));
    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(
      container.querySelector('[data-cover-drop]')?.getAttribute('data-art')
    ).toBe('no-art');
  });

  it('removes once and reports the busy state', () => {
    const onRemove = vi.fn();
    const view = renderDialog({ playlist: coveredPlaylist(), onRemove });

    fireEvent.click(screen.getByRole('button', { name: 'Remove cover' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove cover' }));

    expect(onRemove).toHaveBeenCalledTimes(1);

    view.rerender(
      dialogElement({
        playlist: coveredPlaylist(),
        onRemove,
        isRemoving: true
      })
    );

    const removing = screen.getByRole('button', { name: 'Removing' });
    expect(removing).toBeDisabled();
    expect(removing).toHaveAttribute('aria-busy', 'true');

    fireEvent.click(removing);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open with one sentence when removal fails', () => {
    renderDialog({
      playlist: coveredPlaylist(),
      onRemove: vi.fn(),
      removeProblem: 'The cover could not be removed.'
    });

    fireEvent.click(screen.getByRole('button', { name: 'Remove cover' }));

    expect(
      screen.getByRole('dialog', { name: 'Playlist cover' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('The cover could not be removed.')
    ).toBeInTheDocument();
  });

  it('asks before Cancel, Escape and the scrim discard a selection', () => {
    const onClose = vi.fn();
    const { container } = renderDialog({ onClose });

    choose(container, imageFile());

    fireEvent.mouseDown(
      screen.getByRole('dialog').parentElement as HTMLElement
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Discard this image? The image you chose will be lost.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Discard this image? The image you chose will be lost.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { container } = renderDialog({
      playlist: coveredPlaylist(),
      onRemove: vi.fn()
    });

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});

function cropAt(crops: (CoverCrop | null)[], index: number): CoverCrop {
  const crop = crops[index];

  if (crop === null || crop === undefined) {
    throw new Error(`save ${index} sent no crop`);
  }

  return crop;
}

describe('cropping the chosen cover', () => {
  it('turns a loaded file into a stage with its zoom range and reset', () => {
    const { container } = renderDialog();

    choose(container, imageFile());
    loadChosen(container, 2000, 1000);

    expect(screen.getByRole('group')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Zoom' })).toHaveAttribute(
      'aria-valuemax',
      '1.5625'
    );
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('zooms from the rail and the arrow keys and reads the multiplier', () => {
    const { container } = renderDialog();

    choose(container, imageFile());
    loadChosen(container, 2000, 1000);
    const slider = screen.getByRole('slider', { name: 'Zoom' });
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue(box(200, 4));

    fireEvent.pointerDown(slider, { clientX: 100, pointerId: 1 });
    expect(slider).toHaveAttribute('aria-valuetext', '1.3x');

    fireEvent.pointerUp(slider, { clientX: 100, pointerId: 1 });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByText('1.4x')).toBeInTheDocument();

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });

    expect(screen.getByText('1.0x')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
  });

  it('pans with a drag and never leaves an empty edge', () => {
    const crops: (CoverCrop | null)[] = [];
    const { container } = renderDialog({
      onSubmit: (_file, crop) => crops.push(crop)
    });

    choose(container, imageFile());
    loadChosen(container, 900, 300);
    const stage = screen.getByRole('group');
    vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue(box(280, 280));

    fireEvent.pointerDown(stage, { clientX: 200, clientY: 140, pointerId: 1 });
    fireEvent.pointerMove(stage, { clientX: 100, clientY: 140, pointerId: 1 });
    fireEvent.pointerUp(stage, { clientX: 100, clientY: 140, pointerId: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const dragged = cropAt(crops, 0);
    expect(dragged.width).toBeCloseTo(1 / 3);
    expect(dragged.height).toBeCloseTo(1);
    expect(dragged.x).toBeGreaterThan(1 / 3);

    fireEvent.pointerDown(stage, { clientX: 280, clientY: 140, pointerId: 2 });
    fireEvent.pointerMove(stage, {
      clientX: -10000,
      clientY: 140,
      pointerId: 2
    });
    fireEvent.pointerUp(stage, { clientX: -10000, clientY: 140, pointerId: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const clamped = cropAt(crops, 1);
    expect(clamped.x + clamped.width).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('pans with the arrow keys on the stage', () => {
    const crops: (CoverCrop | null)[] = [];
    const { container } = renderDialog({
      onSubmit: (_file, crop) => crops.push(crop)
    });

    choose(container, imageFile());
    loadChosen(container, 900, 300);

    fireEvent.keyDown(screen.getByRole('group'), { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const panned = cropAt(crops, 0);
    expect(panned.x).toBeLessThan(1 / 3);
    expect(panned.x + panned.width).toBeGreaterThanOrEqual(0);
  });

  it('resets to centered at 1x and then saves no crop', () => {
    const crops: (CoverCrop | null)[] = [];
    const { container } = renderDialog({
      onSubmit: (_file, crop) => crops.push(crop)
    });

    choose(container, imageFile());
    loadChosen(container, 2000, 1000);
    const slider = screen.getByRole('slider', { name: 'Zoom' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByText('1.0x')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(crops).toEqual([null]);
  });

  it('keeps the dialog and the crop when the save fails', () => {
    const view = renderDialog();
    const { container } = view;

    choose(container, imageFile());
    loadChosen(container, 2000, 1000);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Zoom' }), {
      key: 'ArrowRight'
    });

    view.rerender(dialogElement({ problem: 'The cover could not be saved.' }));

    expect(
      screen.getByRole('dialog', { name: 'Playlist cover' })
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The cover could not be saved.'
    );
    expect(screen.getByText('1.1x')).toBeInTheDocument();
  });

  it('resets the crop when another file is chosen', () => {
    const { container } = renderDialog();

    choose(container, imageFile());
    loadChosen(container, 2000, 1000);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Zoom' }), {
      key: 'ArrowRight'
    });
    expect(screen.getByText('1.1x')).toBeInTheDocument();

    choose(container, imageFile('second.png', 'image/png'));

    expect(
      screen.queryByRole('slider', { name: 'Zoom' })
    ).not.toBeInTheDocument();

    loadChosen(container, 2000, 1000);

    expect(screen.getByText('1.0x')).toBeInTheDocument();
  });

  it('shows an existing custom cover as a preview with no stage', () => {
    renderDialog({ playlist: coveredPlaylist(), onRemove: vi.fn() });

    expect(
      screen.queryByRole('slider', { name: 'Zoom' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reset' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('has no axe violations on the crop stage', async () => {
    const { container } = renderDialog();

    choose(container, imageFile());
    loadChosen(container, 2000, 1000);

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });

    expect(results.violations).toEqual([]);
  });
});
