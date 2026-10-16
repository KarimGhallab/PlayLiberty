import type { MouseEvent as ReactMouseEvent } from 'react';

/*
 * The door rule the header's arrangements share: a press anywhere on an item
 * that is not a link, a control or an open panel opens the playlist. An item
 * stays a div because an anchor cannot hold the buttons it carries.
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
