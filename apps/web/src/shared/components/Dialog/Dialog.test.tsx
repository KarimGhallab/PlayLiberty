import { act, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Dialog from './Dialog';

/*
 * The exit is a real 180ms wait and the dialog unmounts itself when it elapses;
 * fake timers make the closing tests advance the clock rather than wait.
 */
function runExit(): void {
  act(() => {
    vi.advanceTimersByTime(180);
  });
}

interface HarnessProps {
  readonly withInitialFocus?: boolean;
  readonly onRequestClose?: () => void;
}

/*
 * An opener that stays mounted, so the return trip has somewhere to land, and a
 * dialog with two stops: the field it opens on and the action that closes it.
 */
function Harness({ withInitialFocus = true, onRequestClose }: HarnessProps) {
  const [open, setOpen] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog
        open={open}
        title="Test dialog"
        description="A dialog under test."
        initialFocus={withInitialFocus ? field : undefined}
        onRequestClose={() => {
          onRequestClose?.();
          setOpen(false);
        }}
        actions={
          <button type="button" onClick={() => setOpen(false)}>
            Done
          </button>
        }>
        <input ref={field} aria-label="Field" />
      </Dialog>
    </>
  );
}

/*
 * A dialog with nothing focusable inside, so its own container is the only place
 * focus can be held.
 */
function BareDialog() {
  const [open, setOpen] = useState(true);

  return (
    <Dialog
      open={open}
      title="Bare dialog"
      description="Nothing to focus."
      onRequestClose={() => setOpen(false)}
      actions={<span>No controls</span>}>
      <span>Nothing to focus.</span>
    </Dialog>
  );
}

describe('Dialog', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on the field the caller gave it', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(
      screen.getByRole('dialog', { name: 'Test dialog' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Field')).toHaveFocus();
  });

  it('falls back to the first focusable when the caller gave no field', () => {
    render(<Harness withInitialFocus={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByLabelText('Field')).toHaveFocus();
  });

  it('falls back to the container when nothing inside can be focused', () => {
    render(<BareDialog />);

    expect(screen.getByRole('dialog', { name: 'Bare dialog' })).toHaveFocus();
  });

  it('wraps Tab from the last focusable back to the first', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    screen.getByRole('button', { name: 'Done' }).focus();
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(screen.getByLabelText('Field')).toHaveFocus();
  });

  it('wraps Shift+Tab from the first focusable back to the last', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    screen.getByLabelText('Field').focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });

    expect(screen.getByRole('button', { name: 'Done' })).toHaveFocus();
  });

  it('returns focus to the opener when it closes', () => {
    vi.useFakeTimers();
    render(<Harness />);

    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);

    expect(screen.getByLabelText('Field')).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    runExit();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('asks to close on Escape', () => {
    const onRequestClose = vi.fn();
    vi.useFakeTimers();
    render(<Harness onRequestClose={onRequestClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('asks to close on a press against the scrim', () => {
    const onRequestClose = vi.fn();
    vi.useFakeTimers();
    render(<Harness onRequestClose={onRequestClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    const scrim = screen.getByRole('dialog').parentElement;

    if (scrim === null) {
      throw new Error('the dialog has no scrim');
    }

    fireEvent.mouseDown(scrim);

    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
