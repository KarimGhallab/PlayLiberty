import type { ReactNode, RefObject } from 'react';
import { Fragment } from 'react';

/*
 * The one renderer every menu uses: the roles, the divider before a destructive
 * item, and the close-then-return-focus contract. The caller owns the trigger,
 * the open state and its stylesheet.
 */

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
  triggerRef,
  onClose,
  className,
  itemClassName,
  variant = MenuVariant.Item,
  ariaLabel,
  divided = false
}: MenuProps) {
  /* A chosen item closes the menu and puts the keyboard back on the control it
   * opened from, then runs its action. */
  const select = (item: MenuItem): void => {
    onClose();
    triggerRef.current?.focus();
    item.onSelect();
  };

  const radio = variant === MenuVariant.Radio;

  return (
    <div className={className} role="menu" aria-label={ariaLabel}>
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
