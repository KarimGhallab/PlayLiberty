import { act, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

describe('AddPlaylistDialog', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts open on the playlist link field', () => {
    render(<AddPlaylistDialog open onSubmit={vi.fn()} onClose={vi.fn()} />);

    expect(
      screen.getByRole('dialog', { name: 'Add a playlist' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Playlist link')).toHaveFocus();
  });

  it('draws nothing while it has never been opened', () => {
    render(
      <AddPlaylistDialog open={false} onSubmit={vi.fn()} onClose={vi.fn()} />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the node mounted through the exit and unmounts when it elapses', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <AddPlaylistDialog open onSubmit={vi.fn()} onClose={vi.fn()} />
    );

    rerender(
      <AddPlaylistDialog open={false} onSubmit={vi.fn()} onClose={vi.fn()} />
    );

    /* The exit is running, so the dialog is still on screen. */
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    runExit();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('refuses an empty URL with the schema and makes no request', () => {
    const onSubmit = vi.fn();
    render(<AddPlaylistDialog open onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
    );
  });

  it('refuses a malformed URL with the schema and makes no request', () => {
    const onSubmit = vi.fn();
    render(<AddPlaylistDialog open onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: 'not a url' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('submits a valid URL and the trimmed value', () => {
    const onSubmit = vi.fn();
    render(<AddPlaylistDialog open onSubmit={onSubmit} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Playlist link'), {
      target: { value: '  https://www.youtube.com/playlist?list=PL-demo  ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).toHaveBeenCalledWith(
      'https://www.youtube.com/playlist?list=PL-demo'
    );
  });

  it('shows the server problem beside the field', () => {
    render(
      <AddPlaylistDialog
        open
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        problem="Paste a YouTube playlist link, such as https://youtube.com/playlist?list=..."
      />
    );

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
    render(
      <AddPlaylistDialog open onSubmit={onSubmit} onClose={vi.fn()} isWorking />
    );

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
    const { rerender } = render(
      <AddPlaylistDialog open onSubmit={vi.fn()} onClose={onClose} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    /*
     * The caller owns `open`, so the press only asks to close. The fade then runs
     * once the caller flips `open`, and the node unmounts when it elapses.
     */
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <AddPlaylistDialog open={false} onSubmit={vi.fn()} onClose={onClose} />
    );
    runExit();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks to close on Escape', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<AddPlaylistDialog open onSubmit={vi.fn()} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <AddPlaylistDialog open onSubmit={vi.fn()} onClose={vi.fn()} />
    );

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
