/*
 * Which presses the window transport may claim: the bar's Space and arrows, the
 * volume keys, and the skip chords all ask here, so no two handlers disagree
 * about who owns a key.
 */

/* A control a press would activate, or a widget an arrow would navigate. */
const KEY_OWNING_CONTROL = [
  'button',
  'a[href]',
  'input',
  'textarea',
  'select',
  '[role="button"]',
  '[role="link"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="slider"]',
  '[role="dialog"]',
  '[aria-haspopup]:not([aria-haspopup="false"])'
].join(',');

/* Where a press still edits text. */
const TYPING = 'input, textarea, select';

/* The surfaces that read their own keys while they are open. */
const MODAL_SURFACE = '[role="menu"], [role="dialog"]';

function pressedTarget(event: KeyboardEvent): HTMLElement | null {
  const target =
    event.target instanceof HTMLElement ? event.target : document.activeElement;

  return target instanceof HTMLElement ? target : null;
}

function isTyping(target: HTMLElement | null): boolean {
  return (
    target !== null &&
    (target.isContentEditable || target.closest(TYPING) !== null)
  );
}

/*
 * Space, the shift chords and the mute key: none of them activates a control,
 * since Enter and the pointer already do, so only text entry and an open menu
 * or dialog may keep the press.
 */
export function ownsGlobalKey(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) {
    return true;
  }

  const target = pressedTarget(event);

  return (
    isTyping(target) ||
    (target !== null && target.closest(MODAL_SURFACE) !== null)
  );
}

/* An arrow is a focused control's navigation key as much as a transport one. */
export function ownsArrowKey(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) {
    return true;
  }

  const target = pressedTarget(event);

  return (
    target !== null &&
    (isTyping(target) || target.closest(KEY_OWNING_CONTROL) !== null)
  );
}
