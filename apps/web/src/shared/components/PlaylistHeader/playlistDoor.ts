import type { MouseEvent as ReactMouseEvent } from 'react';

/*
 * The door rule the header's arrangements share, which is the library's own: a
 * press anywhere on an item that is not a link, a control or an open panel opens
 * the playlist. It is why an item stays a div rather than an anchor, which cannot
 * hold the buttons an item carries, and why the controls and the two links carve
 * themselves out rather than being the only way past it.
 */
export function playlistDoor(
  onOpen: () => void
): (event: ReactMouseEvent<HTMLElement>) => void {
  return event => {
    if (
      (event.target as HTMLElement).closest('a, button, [role="menu"]') !== null
    ) {
      return;
    }

    onOpen();
  };
}
