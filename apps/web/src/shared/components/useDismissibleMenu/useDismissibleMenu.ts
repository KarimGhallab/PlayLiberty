import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

/*
 * One dismissible menu's dismissal and keyboard contract, shared by every
 * overflow in the app: a press outside or Escape closes it, the arrows walk it,
 * and Tab and Escape leave focus on the trigger.
 */

/** What a menu can land on: the three menuitem roles and a listbox's options. A
 * disabled control is not a stop. */
const MENU_ITEM_SELECTOR =
  ':is([role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="option"]):not([disabled])';

export interface DismissibleMenuOptions {
  readonly open: boolean;
  readonly containerRef: RefObject<HTMLElement | null>;
  /** The control that opens the menu: its arrows open onto the last and the
   * first item, and Escape puts focus back on it. */
  readonly triggerRef?: RefObject<HTMLElement | null>;
  /** Open the menu. The trigger's arrows call it, because a listener cannot. */
  readonly onOpen?: () => void;
  /** Close the menu. The hook moves focus itself, so this must not. */
  readonly onClose: () => void;
}

export function useDismissibleMenu({
  open,
  containerRef,
  triggerRef,
  onOpen,
  onClose
}: DismissibleMenuOptions): void {
  /* The end the next open lands on: only ArrowUp on the trigger asks for the
   * last item, and the ask is spent by the open that honours it. */
  const openAtEnd = useRef(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const container = containerRef.current;
    const items = (): HTMLElement[] =>
      Array.from(
        container?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR) ?? []
      );
    const focusItem = (index: number): void => {
      const stops = items();

      if (stops.length === 0) {
        return;
      }

      const wrapped = ((index % stops.length) + stops.length) % stops.length;
      stops[wrapped]?.focus();
    };
    const focusedIndex = (): number =>
      items().findIndex(stop => stop === document.activeElement);

    /* The open lands on an item, because a menu that opens with focus still on
     * the trigger answers the arrows with nothing. */
    focusItem(openAtEnd.current ? -1 : 0);
    openAtEnd.current = false;

    const onMenuKeyDown = (event: KeyboardEvent): void => {
      const step =
        event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : null;

      if (step !== null) {
        event.preventDefault();
        /* The window's own ArrowUp and ArrowDown move the volume, and a menu
         * owns the arrows for as long as it is open. */
        event.stopPropagation();
        focusItem(focusedIndex() + step);
        return;
      }

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        event.stopPropagation();
        focusItem(event.key === 'Home' ? 0 : -1);
        return;
      }

      /* Tab leaves the menu: focus goes back to the trigger and the browser's
       * own step carries on from there. */
      if (event.key === 'Tab') {
        event.stopPropagation();
        onClose();
        triggerRef?.current?.focus();
      }
    };

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;

      if (
        container !== null &&
        target instanceof Node &&
        !container.contains(target)
      ) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
        triggerRef?.current?.focus();
      }
    };

    container?.addEventListener('keydown', onMenuKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      container?.removeEventListener('keydown', onMenuKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, containerRef, triggerRef, onClose]);

  /* Bound while the menu is closed too, because this is the press that opens it.
   * Only the two arrows answer: every other key belongs to the trigger. */
  useEffect(() => {
    const trigger = triggerRef?.current;

    if (trigger === null || trigger === undefined || onOpen === undefined) {
      return;
    }

    const onTriggerKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
        return;
      }

      event.preventDefault();
      openAtEnd.current = event.key === 'ArrowUp';
      onOpen();
    };

    trigger.addEventListener('keydown', onTriggerKeyDown);

    return () => trigger.removeEventListener('keydown', onTriggerKeyDown);
  }, [triggerRef, onOpen]);
}
