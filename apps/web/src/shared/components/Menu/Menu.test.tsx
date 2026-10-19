import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useDismissibleMenu } from '../useDismissibleMenu/useDismissibleMenu';
import Menu, { MenuVariant } from './Menu';
import type { MenuItem } from './Menu';

/* The caller owns the trigger and the hook; the harness is the smallest caller
 * that can prove the menu's markup and its close-focus contract. */
interface HarnessProps {
  readonly items: readonly MenuItem[];
  readonly variant?: MenuVariant;
  readonly divided?: boolean;
}

function Harness({ items, variant, divided = false }: HarnessProps) {
  const [open, setOpen] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useDismissibleMenu({
    open,
    containerRef: rootRef,
    triggerRef,
    onClose: () => setOpen(false)
  });

  return (
    <div ref={rootRef}>
      <button ref={triggerRef} type="button">
        Trigger
      </button>
      {open ? (
        <Menu
          items={items}
          triggerRef={triggerRef}
          onClose={() => setOpen(false)}
          className="menu"
          itemClassName="item"
          variant={variant}
          divided={divided}
        />
      ) : null}
    </div>
  );
}

function items(onSelect: () => void): MenuItem[] {
  return [
    {
      key: 'one',
      label: 'One',
      icon: <span aria-hidden="true" />,
      onSelect
    },
    {
      key: 'two',
      label: 'Two',
      icon: <span aria-hidden="true" />,
      disabled: true,
      onSelect
    },
    {
      key: 'three',
      label: 'Three',
      icon: <span aria-hidden="true" />,
      destructive: true,
      onSelect
    }
  ];
}

function radioItems(language: string): MenuItem[] {
  return ['English', 'French'].map(label => ({
    key: label,
    label,
    icon: <span aria-hidden="true" />,
    checked: label === language,
    onSelect: () => undefined
  }));
}

describe('Menu', () => {
  it('renders every item with the menuitem role and its disabled state', () => {
    render(<Harness items={items(vi.fn())} />);

    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(screen.getByRole('menuitem', { name: 'Two' })).toBeDisabled();
  });

  it('draws the divider before a destructive item when the caller asks', () => {
    const { container } = render(<Harness items={items(vi.fn())} divided />);

    expect(container.querySelectorAll('hr')).toHaveLength(1);
  });

  it('leaves the divider out when the caller does not ask', () => {
    const { container } = render(<Harness items={items(vi.fn())} />);

    expect(container.querySelectorAll('hr')).toHaveLength(0);
  });

  it('closes, returns focus to the trigger and runs the chosen item', () => {
    const onSelect = vi.fn();
    render(<Harness items={items(onSelect)} />);

    fireEvent.click(screen.getByRole('menuitem', { name: 'One' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trigger' })).toHaveFocus();
  });

  it('marks the radio variant checked and unchecked', () => {
    render(
      <Harness variant={MenuVariant.Radio} items={radioItems('English')} />
    );

    expect(
      screen.getByRole('menuitemradio', { name: 'English' })
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByRole('menuitemradio', { name: 'French' })
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('walks the items with the arrows, skips the disabled one and returns on Escape', () => {
    render(<Harness items={items(vi.fn())} />);

    const first = screen.getByRole('menuitem', { name: 'One' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Three' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trigger' })).toHaveFocus();
  });
});
