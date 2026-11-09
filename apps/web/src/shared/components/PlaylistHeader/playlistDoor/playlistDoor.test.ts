import { describe, expect, it, vi } from 'vitest';

import { playlistDoorProps } from './playlistDoor';

describe('the pending door props', () => {
  it('leaves a live door alone', () => {
    expect(playlistDoorProps(false)).toEqual({
      'aria-disabled': undefined,
      tabIndex: undefined,
      onClick: undefined
    });
  });

  it('closes a pending door and guards its click', () => {
    const door = playlistDoorProps(true);

    expect(door['aria-disabled']).toBe(true);
    expect(door.tabIndex).toBe(-1);

    const preventDefault = vi.fn();
    door.onClick?.({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });
});
