import type { RefObject } from 'react';
import { useEffect } from 'react';

/*
 * One dismissible menu's dismissal, shared by every overflow and dropdown in the
 * app. A menu closes on a press outside its anchor and on Escape, and the two
 * differ in where the keyboard ends up: Escape hands focus back to the trigger,
 * because the keyboard must never land on nothing, while an outside press leaves
 * focus where the user put it, because they moved it there on purpose.
 *
 * A press inside the anchor is left alone so an item's own handler can run, and
 * a press outside is guarded on `Node`, so a non-node target cannot throw the
 * containment check.
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
