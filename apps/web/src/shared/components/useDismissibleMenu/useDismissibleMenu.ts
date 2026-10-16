import type { RefObject } from 'react';
import { useEffect } from 'react';

/*
 * One dismissible menu's dismissal, shared by every overflow in the app: a menu
 * closes on a press outside its anchor and on Escape. Escape returns focus to
 * the trigger; an outside press leaves focus where the user put it.
 */

export interface DismissibleMenuOptions {
  readonly open: boolean;
  readonly containerRef: RefObject<HTMLElement | null>;
  /** Close the menu. The hook moves focus itself, so this must not. */
  readonly onClose: () => void;
  readonly returnFocusTo?: RefObject<HTMLElement | null>;
}

export function useDismissibleMenu({
  open,
  containerRef,
  onClose,
  returnFocusTo
}: DismissibleMenuOptions): void {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;

      if (
        containerRef.current !== null &&
        target instanceof Node &&
        !containerRef.current.contains(target)
      ) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
        returnFocusTo?.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, containerRef, onClose, returnFocusTo]);
}
