import { act, fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePlayerStore } from '../../player/playerStore/playerStore';
import FloatingAction from './FloatingAction';

/*
 * The floating add action's own test: a button whose name is the whole of it, and
 * the one thing about its surroundings that moves it, which is the docked bar.
 */
function track() {
  return {
    id: 'track-1',
    title: 'Blue In Green',
    playlistId: 'playlist-1',
    playlistName: 'Evening Jazz',
    durationSeconds: 200,
    thumbnailPath: null
  };
}

beforeEach(() => {
  usePlayerStore.getState().clear();
});

describe('FloatingAction', () => {
  it('names itself for a reader and takes the press', () => {
    const onClick = vi.fn();

    render(<FloatingAction label="Add a playlist" onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Add a playlist' });

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  /*
   * The button sits above the bar rather than behind it, and the bar is an overlay
   * that follows the queue, so the state is the bar's own presence.
   */
  it('marks itself docked while a queue is the bar’s', () => {
    render(<FloatingAction label="Add a playlist" onClick={() => undefined} />);

    const button = screen.getByRole('button', { name: 'Add a playlist' });

    expect(button).not.toHaveAttribute('data-docked');

    act(() =>
      usePlayerStore.getState().startQueue('playlist-1', [track()], 'track-1')
    );

    expect(button).toHaveAttribute('data-docked', 'true');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <FloatingAction label="Add a track" onClick={() => undefined} />
    );

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
