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

function imageFile(name = 'cover.jpg', type = 'image/jpeg', bytes = 8): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

function renderDialog(props: Partial<Parameters<typeof CoverDialog>[0]> = {}) {
  return render(
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

function choose(container: HTMLElement, file: File): void {
  const input = container.querySelector<HTMLInputElement>('input[type=file]');

  if (input === null) {
    throw new Error('the dialog has no file input');
  }

  fireEvent.change(input, { target: { files: [file] } });
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

    /* The square is a drop target, not a second button. */
    expect(container.querySelector('[data-cover-drop]')?.tagName).not.toBe(
      'BUTTON'
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

    expect(onSubmit).toHaveBeenCalledWith(file);
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
    const { container } = renderDialog();

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
