import { act, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import AddPlaylistDialog from './AddPlaylistDialog';

/*
 * The exit is a real 180ms wait, and the dialog unmounts itself when it elapses.
 * Fake timers make that deterministic, so the tests advance the clock rather than
 * waiting on it.
 */
function runExit(): void {
  act(() => {
    vi.advanceTimersByTime(180);
  });
}

function renderDialog(
  props: Partial<Parameters<typeof AddPlaylistDialog>[0]> = {}
) {
  return render(
    <I18nProvider preferred={['en']}>
      <AddPlaylistDialog open onSubmit={vi.fn()} onClose={vi.fn()} {...props} />
    </I18nProvider>
  );
}

describe('AddPlaylistDialog', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts open on the playlist link field', () => {
    renderDialog();

    expect(
      screen.getByRole('dialog', { name: 'Add a playlist' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Playlist link')).toHaveFocus();
  });

  it('draws nothing while it has never been opened', () => {
    renderDialog({ open: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the node mounted through the exit and unmounts when it elapses', () => {
    vi.useFakeTimers();
    const { rerender } = renderDialog();

    rerender(
      <I18nProvider preferred={['en']}>
        <AddPlaylistDialog open={false} onSubmit={vi.fn()} onClose={vi.fn()} />
      </I18nProvider>
    );

    /* The exit is running, so the dialog is still on screen. */
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    runExit();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('refuses an empty URL with the schema and makes no request', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
    );
  });

  it('refuses a malformed URL with the schema and makes no request', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'not a url' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('submits a valid URL and the trimmed value, with the setting on', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: '  https://www.youtube.com/playlist?list=PL-demo  ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).toHaveBeenCalledWith(
      'https://www.youtube.com/playlist?list=PL-demo',
      true
    );
  });

  it('starts with the skip control on', () => {
    renderDialog();

    expect(
      screen.getByRole('checkbox', { name: 'Skip non-music parts' })
    ).toBeChecked();
  });

  it('sends the setting off when the control is turned off', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PL-demo' }
    });
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Skip non-music parts' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).toHaveBeenCalledWith(
      'https://www.youtube.com/playlist?list=PL-demo',
      false
    );
  });

  it('shows the server problem beside the field', () => {
    renderDialog({
      problem:
        'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
    );
    expect(screen.getByLabelText('Playlist link')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('marks the field busy and refuses a second submit while working', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit, isWorking: true });

    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'https://www.youtube.com/playlist?list=PL-demo' }
    });
    fireEvent.click(screen.getByRole('button', { name: /adding/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Playlist link')).toBeDisabled();
  });

  it('closes on cancel after the exit animation', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { rerender } = renderDialog({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    /*
     * The caller owns `open`, so the press only asks to close. The fade then runs
     * once the caller flips `open`, and the node unmounts when it elapses.
     */
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <I18nProvider preferred={['en']}>
        <AddPlaylistDialog open={false} onSubmit={vi.fn()} onClose={onClose} />
      </I18nProvider>
    );
    runExit();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks to close on Escape', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.keyDown(window, { key: 'Escape' });

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
