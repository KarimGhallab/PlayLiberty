import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import { usePlayerStore } from '../playerStore/playerStore';
import type { PlayerTrack } from '../types';
import PlayerBar from './PlayerBar';

const PLAYLIST = 'playlist-1';

function renderBar() {
  return render(
    <I18nProvider preferred={['en']}>
      <PlayerBar />
    </I18nProvider>
  );
}

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
    renderBar();

    expect(screen.queryByLabelText('Player')).not.toBeInTheDocument();
  });

  it('shows the current track, its playlist and the times', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    usePlayerStore.getState().setPosition(72);
    renderBar();

    expect(screen.getByLabelText('Player')).toBeInTheDocument();
    expect(screen.getByText('track-1')).toBeInTheDocument();
    expect(screen.getByText('Rain On The Window')).toBeInTheDocument();
    expect(screen.getByText('1:12')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });

  /*
   * The rail is in the fixed bar and always visible, so it is not deferred; it
   * only decodes off the main thread.
   */
  it('async-decodes the artwork without deferring it', () => {
    const withArt = {
      ...first,
      thumbnailPath: '/api/v1/tracks/track-1/thumbnail'
    };
    usePlayerStore.getState().startQueue(PLAYLIST, [withArt], withArt.id);
    const { container } = renderBar();

    const image = container.querySelector('img');

    expect(image).toHaveAttribute('decoding', 'async');
    expect(image).not.toHaveAttribute('loading', 'lazy');
  });

  it('toggles playback and skips within the queue', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    renderBar();

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Next track' }));
    expect(usePlayerStore.getState().currentId).toBe('track-2');

    fireEvent.click(screen.getByRole('button', { name: 'Previous track' }));
    expect(usePlayerStore.getState().currentId).toBe('track-1');
  });

  it('disables next on the last track', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first, second], first.id);
    renderBar();

    const next = screen.getByRole('button', { name: 'Next track' });
    expect(next).toBeEnabled();

    fireEvent.click(next);

    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(screen.getByRole('button', { name: 'Next track' })).toBeDisabled();
  });

  it('disables next when the queue holds a single track', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    renderBar();

    expect(screen.getByRole('button', { name: 'Next track' })).toBeDisabled();
  });

  it('moves the playhead with the arrow keys and clamps at the ends', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    renderBar();

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
    renderBar();

    fireEvent.keyDown(document.body, { key: ' ' });
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    fireEvent.keyDown(document.body, { key: ' ' });
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('moves the playhead by five seconds with the arrows off the seeker', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    renderBar();

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
    renderBar();

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
    renderBar();

    const slider = screen.getByRole('slider', { name: 'Position in track' });

    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '180');
    expect(slider).toHaveAttribute('aria-valuenow', '72');
    expect(slider).toHaveAttribute('aria-valuetext', '1:12 of 3:00');
  });

  /*
   * The fill is scaled rather than resized: a `width` transition forces layout
   * on every frame, and the bar is mounted across the app. The scrub's first
   * child is the fill, so the test reads the composited property it is drawn
   * with and asserts the layout one is gone.
   */
  it('moves the fill with a composited transform, not a layout width', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    usePlayerStore.getState().setPosition(90);
    renderBar();

    const slider = screen.getByRole('slider', { name: 'Position in track' });
    const fill = slider.firstElementChild as HTMLElement;

    expect(fill.style.transform).toBe('scaleX(0.5)');
    expect(fill.style.width).toBe('');
  });

  it('seeks to the pointer against the track box', () => {
    usePlayerStore.getState().startQueue(PLAYLIST, [first], first.id);
    renderBar();

    const slider = screen.getByRole('slider', { name: 'Position in track' });
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 200
    } as DOMRect);

    fireEvent.pointerDown(slider, { clientX: 200, pointerId: 1 });

    expect(usePlayerStore.getState().positionSeconds).toBe(90);
  });
});
