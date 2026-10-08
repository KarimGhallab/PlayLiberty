import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDismissibleMenu } from './useDismissibleMenu';

/*
 * The hook's contract is the two document listeners it owns: a press outside the
 * anchor closes the menu and leaves focus alone, and Escape closes it and hands
 * focus back to the trigger. The test drives real DOM nodes as the anchor, the
 * press target and the trigger, so `contains` and `focus` are the browser's and
 * not a fake.
 */

function setup(options: { open?: boolean; returnFocus?: boolean } = {}) {
  const anchor = document.createElement('div');
  const inside = document.createElement('button');
  const outside = document.createElement('button');
  const trigger = document.createElement('button');

  anchor.append(inside);
  document.body.append(anchor, outside, trigger);

  const containerRef = { current: anchor };
  const returnFocusTo =
    options.returnFocus === false ? undefined : { current: trigger };
  const onClose = vi.fn();

  const view = renderHook(
    ({ open }: { open: boolean }) =>
      useDismissibleMenu({ open, containerRef, onClose, returnFocusTo }),
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
