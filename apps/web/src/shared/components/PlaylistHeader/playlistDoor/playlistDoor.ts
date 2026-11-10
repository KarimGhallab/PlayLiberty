import type { MouseEvent as ReactMouseEvent } from 'react';

/* The header's shared door rule: a press anywhere except a link, control or
 * open panel opens it. Items stay divs; an anchor cannot hold their buttons. */
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

/* The guard only cancels the press, so a stub can stand in for the event. */
export interface DoorClickEvent {
  preventDefault(): void;
}

/* The anchor props a pending item lends whichever door an arrangement places:
 * out of the tab order, announced disabled, and unable to navigate. */
export interface PlaylistDoorProps {
  readonly 'aria-disabled': true | undefined;
  readonly tabIndex: -1 | undefined;
  readonly onClick: ((event: DoorClickEvent) => void) | undefined;
}

export function playlistDoorProps(pending: boolean): PlaylistDoorProps {
  if (!pending) {
    return {
      'aria-disabled': undefined,
      tabIndex: undefined,
      onClick: undefined
    };
  }

  return {
    'aria-disabled': true,
    tabIndex: -1,
    onClick: event => event.preventDefault()
  };
}
