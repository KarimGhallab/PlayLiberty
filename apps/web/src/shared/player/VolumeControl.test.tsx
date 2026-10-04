import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import VolumeControl from './VolumeControl';
import { usePlayerStore } from './playerStore';

/*
 * The window-level key handler is what these tests drive, so the control is
 * mounted once and the presses are dispatched on the document. The store is the
 * real one, because the mute-versus-level rule is the thing under test.
 */

beforeEach(() => {
  usePlayerStore.getState().clear();
});

describe('VolumeControl', () => {
  it('shows the rail only while the pointer is on it', () => {
    render(<VolumeControl />);

    expect(
      screen.queryByRole('slider', { name: 'Volume' })
    ).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Mute' }), {});

    expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
  });

  it('mutes on press and keeps the level', () => {
    usePlayerStore.getState().setVolume(0.7);
    render(<VolumeControl />);

    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));

    expect(usePlayerStore.getState().muted).toBe(true);
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.7);
    expect(screen.getByRole('button', { name: 'Unmute' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('raises and lowers the level with the window arrows', () => {
    usePlayerStore.getState().setVolume(0.5);
    render(<VolumeControl />);

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.6);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.4);
  });

  it('changes the level without clearing the mute', () => {
    usePlayerStore.getState().setVolume(0.5);
    usePlayerStore.getState().setMuted(true);
    render(<VolumeControl />);

    fireEvent.keyDown(window, { key: 'ArrowUp' });

    expect(usePlayerStore.getState().volume).toBeCloseTo(0.6);
    expect(usePlayerStore.getState().muted).toBe(true);
  });

  it('toggles the mute with M and leaves text fields alone', () => {
    render(<VolumeControl />);

    fireEvent.keyDown(window, { key: 'm' });
    expect(usePlayerStore.getState().muted).toBe(true);

    fireEvent.keyDown(window, { key: 'm' });
    expect(usePlayerStore.getState().muted).toBe(false);

    const field = document.createElement('input');
    document.body.append(field);
    fireEvent.keyDown(field, { key: 'm' });
    expect(usePlayerStore.getState().muted).toBe(false);
    field.remove();
  });

  it('clamps the arrows at the ends', () => {
    usePlayerStore.getState().setVolume(1);
    render(<VolumeControl />);

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(usePlayerStore.getState().volume).toBe(1);

    usePlayerStore.getState().setVolume(0);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(usePlayerStore.getState().volume).toBe(0);
  });
});
