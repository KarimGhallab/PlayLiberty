import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlayerStore } from '../playerStore/playerStore';
import type { PlayerTrack } from '../types';
import PlayerBar from './PlayerBar';

const PLAYLIST = 'playlist-1';

function track(id: string): PlayerTrack {
  return {
    id,
    title: id,
    playlistId: PLAYLIST,
    playlistName: 'Rain On The Window',
    durationSeconds: 180,
    thumbnailPath: null
  };
}

const first = track('track-1');
const second = track('track-2');

beforeEach(() => {
  usePlayerStore.getState().clear();
  HTMLMediaElement.prototype.play = vi.fn(() =>
    Promise.resolve()
  ) as unknown as () => Promise<void>;
  HTMLMediaElement.prototype.pause = vi.fn() as unknown as () => void;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PlayerBar', () => {
  it('is absent at rest', () => {
    render(<PlayerBar />);

    expect(screen.queryByLabelText('Player')).not.toBeInTheDocument();
  });

  it('shows the current track, its playlist and the times', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().setPosition(72);
    render(<PlayerBar />);

    expect(screen.getByLabelText('Player')).toBeInTheDocument();
    expect(screen.getByText('track-1')).toBeInTheDocument();
    expect(screen.getByText('Rain On The Window')).toBeInTheDocument();
    expect(screen.getByText('1:12')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });

  it('toggles playback and skips within the queue', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    render(<PlayerBar />);

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Next track' }));
    expect(usePlayerStore.getState().currentId).toBe('track-2');

    fireEvent.click(screen.getByRole('button', { name: 'Previous track' }));
    expect(usePlayerStore.getState().currentId).toBe('track-1');
  });

  it('disables next on the last track', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    render(<PlayerBar />);

    const next = screen.getByRole('button', { name: 'Next track' });
    expect(next).toBeEnabled();

    fireEvent.click(next);

    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(screen.getByRole('button', { name: 'Next track' })).toBeDisabled();
  });

  it('disables next when the queue holds a single track', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    render(<PlayerBar />);

    expect(screen.getByRole('button', { name: 'Next track' })).toBeDisabled();
  });

  it('moves the playhead with the arrow keys and clamps at the ends', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    render(<PlayerBar />);

    const slider = screen.getByRole('slider', { name: 'Position in track' });

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(usePlayerStore.getState().positionSeconds).toBe(5);

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(usePlayerStore.getState().positionSeconds).toBe(0);

    fireEvent.keyDown(slider, { key: 'End' });
    expect(usePlayerStore.getState().positionSeconds).toBe(180);
  });

  it('toggles playback from the space bar wherever focus sits', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    render(<PlayerBar />);

    fireEvent.keyDown(document.body, { key: ' ' });
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    fireEvent.keyDown(document.body, { key: ' ' });
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('moves the playhead by five seconds with the arrows off the seeker', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    render(<PlayerBar />);

    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(usePlayerStore.getState().positionSeconds).toBe(5);

    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(usePlayerStore.getState().positionSeconds).toBe(0);

    usePlayerStore.getState().setPosition(180);
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(usePlayerStore.getState().positionSeconds).toBe(180);
  });

  it('leaves the transport keys to a text field', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    render(<PlayerBar />);

    const input = document.createElement('input');
    document.body.append(input);

    fireEvent.keyDown(input, { key: ' ' });
    fireEvent.keyDown(input, { key: 'ArrowRight' });

    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(usePlayerStore.getState().positionSeconds).toBe(0);

    input.remove();
  });

  it('reports the position to assistive technology', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    usePlayerStore.getState().setPosition(72);
    render(<PlayerBar />);

    const slider = screen.getByRole('slider', { name: 'Position in track' });

    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '180');
    expect(slider).toHaveAttribute('aria-valuenow', '72');
    expect(slider).toHaveAttribute('aria-valuetext', '1:12 of 3:00');
  });

  it('seeks to the pointer against the track box', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    render(<PlayerBar />);

    const slider = screen.getByRole('slider', { name: 'Position in track' });
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 200
    } as DOMRect);

    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 1 });

    expect(usePlayerStore.getState().positionSeconds).toBe(90);
  });
});
