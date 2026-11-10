import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import { usePlayerStore } from '../playerStore/playerStore';
import VolumeControl from './VolumeControl';

/*
 * The window-level key handler is what these tests drive, so the control is
 * mounted once and presses are dispatched on the document. The store is real,
 * because the mute-versus-level rule is what is under test.
 */

function renderControl() {
  return render(
    <I18nProvider preferred={['en']}>
      <VolumeControl />
    </I18nProvider>
  );
}

beforeEach(() => {
  usePlayerStore.getState().clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('VolumeControl', () => {
  it('shows the rail only while the pointer is on it', () => {
    renderControl();

    expect(
      screen.queryByRole('slider', { name: 'Volume' })
    ).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Mute' }), {});

    expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
  });

  /*
   * Hover alone never reaches a keyboard or a touch user, so focus opens the
   * rail too and holds it while focus stays inside the control.
   */
  it('opens the rail on focus and keeps it while focus is inside', () => {
    renderControl();

    expect(
      screen.queryByRole('slider', { name: 'Volume' })
    ).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'Mute' });
    fireEvent.focus(button);

    const rail = screen.getByRole('slider', { name: 'Volume' });
    expect(rail).toBeInTheDocument();

    fireEvent.blur(button, { relatedTarget: rail });
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
  });

  it('closes the rail once focus leaves the control', () => {
    renderControl();

    const button = screen.getByRole('button', { name: 'Mute' });
    fireEvent.focus(button);
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();

    fireEvent.blur(button, { relatedTarget: document.body });
    expect(
      screen.queryByRole('slider', { name: 'Volume' })
    ).not.toBeInTheDocument();
  });

  /*
   * A touch browser may never synthesize the mouseenter a tap would need, so
   * the pointerdown itself opens the rail.
   */
  it('opens the rail on a tap', () => {
    renderControl();

    expect(
      screen.queryByRole('slider', { name: 'Volume' })
    ).not.toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Mute' }), {
      pointerId: 1
    });

    expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
  });

  it('mutes on press and keeps the level', () => {
    usePlayerStore.getState().setVolume(0.7);
    renderControl();

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
    renderControl();

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.55);

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.45);
  });

  it('moves the focused rail without passing the key to the window', () => {
    usePlayerStore.getState().setVolume(0.5);
    renderControl();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Mute' }));

    const rail = screen.getByRole('slider', { name: 'Volume' });
    fireEvent.focus(rail);

    fireEvent.keyDown(rail, { key: 'ArrowRight' });
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.55);

    fireEvent.keyDown(rail, { key: 'ArrowLeft' });
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.5);

    fireEvent.keyDown(rail, { key: 'Home' });
    expect(usePlayerStore.getState().volume).toBe(0);

    fireEvent.keyDown(rail, { key: 'End' });
    expect(usePlayerStore.getState().volume).toBe(1);
  });

  it('keeps one notice and restarts its life on the next press', () => {
    vi.useFakeTimers();
    usePlayerStore.getState().setVolume(0.5);
    renderControl();

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(screen.getAllByRole('status')).toHaveLength(1);

    /* Not yet at the notice's own end. */
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole('status')).toHaveTextContent('Volume 55%');

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Volume 60%');

    /* Past the first press's expiry: holds only if the timer restarted. */
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('disposes the notice when its life ends', () => {
    vi.useFakeTimers();
    renderControl();

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2000));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('changes the level without clearing the mute', () => {
    usePlayerStore.getState().setVolume(0.5);
    usePlayerStore.getState().setMuted(true);
    renderControl();

    fireEvent.keyDown(window, { key: 'ArrowUp' });

    expect(usePlayerStore.getState().volume).toBeCloseTo(0.55);
    expect(usePlayerStore.getState().muted).toBe(true);
  });

  it('toggles the mute with M and leaves text fields alone', () => {
    renderControl();

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

  it('leaves the arrows to a focused menu', () => {
    usePlayerStore.getState().setVolume(0.5);
    renderControl();
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    document.body.append(menu);

    fireEvent.keyDown(menu, { key: 'ArrowUp' });

    expect(usePlayerStore.getState().volume).toBeCloseTo(0.5);
    menu.remove();
  });

  it('leaves the mute key to an open menu and to a dialog', () => {
    renderControl();

    for (const role of ['menu', 'dialog']) {
      const surface = document.createElement('div');
      surface.setAttribute('role', role);
      document.body.append(surface);
      surface.focus();

      fireEvent.keyDown(surface, { key: 'm' });

      expect(usePlayerStore.getState().muted).toBe(false);
      surface.remove();
    }
  });

  it('leaves a key another handler already prevented', () => {
    renderControl();
    const other = document.createElement('div');
    other.addEventListener('keydown', event => event.preventDefault());
    document.body.append(other);

    fireEvent.keyDown(other, { key: 'm' });

    expect(usePlayerStore.getState().muted).toBe(false);
    other.remove();
  });

  it('sets the level from where the pointer lands on the rail', () => {
    renderControl();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Mute' }));

    const rail = screen.getByRole('slider', { name: 'Volume' });
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 4,
      left: 0,
      right: 100,
      width: 100,
      height: 4,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    fireEvent.pointerDown(rail, { clientX: 75, clientY: 2, pointerId: 1 });
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.75);
  });

  it('keeps the level moving while the pointer drags and stops on release', () => {
    renderControl();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Mute' }));

    const rail = screen.getByRole('slider', { name: 'Volume' });
    vi.spyOn(rail, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 4,
      left: 0,
      right: 100,
      width: 100,
      height: 4,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    fireEvent.pointerDown(rail, { clientX: 10, clientY: 2, pointerId: 1 });
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.1);

    fireEvent.pointerMove(rail, { clientX: 60, clientY: 2, pointerId: 1 });
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.6);

    fireEvent.pointerUp(rail, { clientX: 60, clientY: 2, pointerId: 1 });

    fireEvent.pointerMove(rail, { clientX: 90, clientY: 2, pointerId: 1 });
    expect(usePlayerStore.getState().volume).toBeCloseTo(0.6);
  });
});
