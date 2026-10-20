import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDismissibleMenu } from './useDismissibleMenu';

/*
 * The test drives real DOM nodes as the anchor, the press target and the
 * trigger, so `contains` and `focus` are the browser's and not a fake.
 */

function setup(options: { open?: boolean; returnFocus?: boolean } = {}) {
  const anchor = document.createElement('div');
  const inside = document.createElement('button');
  const outside = document.createElement('button');
  const trigger = document.createElement('button');

  anchor.append(inside);
  document.body.append(anchor, outside, trigger);

  const containerRef = { current: anchor };
  const triggerRef =
    options.returnFocus === false ? undefined : { current: trigger };
  const onClose = vi.fn();

  const view = renderHook(
    ({ open }: { open: boolean }) =>
      useDismissibleMenu({ open, containerRef, triggerRef, onClose }),
    { initialProps: { open: options.open ?? true } }
  );

  return { onClose, inside, outside, trigger, view };
}

describe('useDismissibleMenu', () => {
  it('closes on a press outside the anchor without moving focus', () => {
    const { onClose, outside, trigger } = setup();

    trigger.focus();
    fireEvent.pointerDown(outside);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
  });

  it('leaves a press inside the anchor alone', () => {
    const { onClose, inside } = setup();

    fireEvent.pointerDown(inside);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape and returns focus to the trigger', () => {
    const { onClose, trigger } = setup();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
  });

  it('closes on Escape when there is no trigger to return to', () => {
    const { onClose } = setup({ returnFocus: false });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('listens for nothing while closed', () => {
    const { onClose, outside } = setup({ open: false });

    fireEvent.pointerDown(outside);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('removes its listeners when it closes', () => {
    const { onClose, outside, view } = setup();

    view.rerender({ open: false });
    fireEvent.pointerDown(outside);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('removes its listeners on unmount', () => {
    const { onClose, outside, view } = setup();

    view.unmount();
    fireEvent.pointerDown(outside);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});

/*
 * The keyboard contract `role="menu"` and `role="listbox"` promise, in a real
 * menu: the items are the ones in the document, so `focus` is the browser's.
 */
function setupMenu(options: { open?: boolean } = {}) {
  const anchor = document.createElement('div');
  const trigger = document.createElement('button');
  const menu = document.createElement('div');
  const items = ['First', 'Second', 'Third'].map(label => {
    const item = document.createElement('button');
    item.setAttribute('role', 'menuitem');
    item.textContent = label;

    return item;
  });

  menu.setAttribute('role', 'menu');
  menu.append(...items);
  anchor.append(trigger, menu);
  document.body.append(anchor);

  const containerRef = { current: anchor };
  const triggerRef = { current: trigger };
  const onOpen = vi.fn();
  const onClose = vi.fn();

  const view = renderHook(
    ({ open }: { open: boolean }) =>
      useDismissibleMenu({ open, containerRef, triggerRef, onOpen, onClose }),
    { initialProps: { open: options.open ?? true } }
  );

  return { items, onClose, onOpen, trigger, view };
}

describe('useDismissibleMenu, the menu keyboard contract', () => {
  it('lands on the first item when it opens', () => {
    const { items } = setupMenu();

    expect(items[0]).toHaveFocus();
  });

  it('walks with the arrows and wraps at either end', () => {
    const { items } = setupMenu();

    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(items[1]).toHaveFocus();

    fireEvent.keyDown(items[1], { key: 'ArrowDown' });
    expect(items[2]).toHaveFocus();

    fireEvent.keyDown(items[2], { key: 'ArrowDown' });
    expect(items[0]).toHaveFocus();

    fireEvent.keyDown(items[0], { key: 'ArrowUp' });
    expect(items[2]).toHaveFocus();
  });

  it('jumps to the ends with Home and End', () => {
    const { items } = setupMenu();

    fireEvent.keyDown(items[1], { key: 'End' });
    expect(items[2]).toHaveFocus();

    fireEvent.keyDown(items[2], { key: 'Home' });
    expect(items[0]).toHaveFocus();
  });

  it('skips a disabled item', () => {
    const { items } = setupMenu();
    items[1].setAttribute('disabled', '');

    fireEvent.keyDown(items[0], { key: 'ArrowDown' });

    expect(items[2]).toHaveFocus();
  });

  it('closes on Tab and hands focus back to the trigger', () => {
    const { items, onClose, trigger } = setupMenu();

    fireEvent.keyDown(items[1], { key: 'Tab' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
  });

  it('opens onto the last item when the trigger is pressed upwards', () => {
    const { items, onOpen, trigger, view } = setupMenu({ open: false });

    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    view.rerender({ open: true });

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(items[2]).toHaveFocus();
  });

  it('opens onto the first item when the trigger is pressed downwards', () => {
    const { items, onOpen, trigger, view } = setupMenu({ open: false });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    view.rerender({ open: true });

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(items[0]).toHaveFocus();
  });

  it('hands nothing a closed menu', () => {
    const { items, onClose, view } = setupMenu();

    view.rerender({ open: false });
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });

    expect(items[0]).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
  });
});
