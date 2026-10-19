import type { ReactNode, RefObject } from 'react';
import { Fragment, useEffect, useState } from 'react';

import { prefersReducedMotion } from '../../useMediaQuery/useMediaQuery';
import styles from './Menu.module.scss';

/*
 * The one renderer every menu uses: the roles, the divider before a destructive
 * item, the close-then-return-focus contract, and the presence that lets an
 * exit finish. The caller owns the trigger, the open state and its styles.
 */

/** `--motion-fast`, 120ms: the one place this component names a time. */
const EXIT_MS = 120;

export enum MenuVariant {
  Item = 'item',
  Radio = 'radio'
}

export interface MenuItem {
  readonly key: string;
  readonly label: string;
  readonly icon: ReactNode;
  readonly destructive?: boolean;
  readonly disabled?: boolean;
  readonly checked?: boolean;
  readonly onSelect: () => void;
}

export interface MenuProps {
  readonly items: readonly MenuItem[];
  /* Whether the caller's trigger has the menu open. Closing keeps the node
   * mounted for the exit; it leaves the accessibility tree at once. */
  readonly open: boolean;
  /* The control the menu opened from, where a chosen item returns focus. */
  readonly triggerRef: RefObject<HTMLElement | null>;
  /* Close the menu. Focus moves here, so the caller only clears its state. */
  readonly onClose: () => void;
  readonly className: string;
  readonly itemClassName: string;
  readonly variant?: MenuVariant;
  readonly ariaLabel?: string;
  /* Whether a destructive item is separated from the items above it. */
  readonly divided?: boolean;
}

export default function Menu({
  items,
  open,
  triggerRef,
  onClose,
  className,
  itemClassName,
  variant = MenuVariant.Item,
  ariaLabel,
  divided = false
}: MenuProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  /* Open mounts at once; close keeps the node through its exit. A reader who
   * asked for no motion gets the unmount at once. */
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }

    if (!mounted) {
      return;
    }

    if (prefersReducedMotion()) {
      setMounted(false);
      setClosing(false);
      return;
    }

    setClosing(true);

    const exit = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_MS);

    return () => window.clearTimeout(exit);
  }, [open, mounted]);

  /* A chosen item closes the menu and puts the keyboard back on the control it
   * opened from, then runs its action. */
  const select = (item: MenuItem): void => {
    onClose();
    triggerRef.current?.focus();
    item.onSelect();
  };

  /* A closing node stays for the exit; an opening one is drawn in the same
   * commit, so the caller's focus effect can find its items. */
  if (!open && !mounted) {
    return null;
  }

  const radio = variant === MenuVariant.Radio;

  return (
    <div
      className={`${styles.menu} ${className}`}
      role="menu"
      aria-label={ariaLabel}
      aria-hidden={closing ? true : undefined}
      data-state={closing ? 'closing' : 'open'}>
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {divided && item.destructive === true && index > 0 ? <hr /> : null}
          <button
            type="button"
            role={radio ? 'menuitemradio' : 'menuitem'}
            tabIndex={-1}
            aria-checked={radio ? item.checked === true : undefined}
            className={itemClassName}
            data-destructive={item.destructive === true ? 'true' : undefined}
            disabled={item.disabled === true}
            onClick={() => select(item)}>
            {item.icon}
            {item.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
