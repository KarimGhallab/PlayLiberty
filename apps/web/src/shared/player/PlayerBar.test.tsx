import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PlayerBar from './PlayerBar';
import { usePlayerStore } from './playerStore';
import type { PlayerTrack } from './types';

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
  HTMLMediaElement.prototype.play = vi.fn(
    () => Promise.resolve()
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
