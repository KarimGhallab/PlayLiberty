import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { prefersReducedMotion } from '../../useMediaQuery/useMediaQuery';
import styles from './Dialog.module.scss';

/*
 * Every dialog is this node with different children, so arrival and exit are
 * written once. `open` drives a two-phase presence: the node stays mounted
 * through its exit, which a timer at `EXIT_MS` ends, not `animationend`.
 */

/** `--motion-base`, 180ms. The one place this component names a time. */
const EXIT_MS = 180;

const scrimStyle = {
  '--dialog-motion': `${EXIT_MS}ms`
} as CSSProperties;

/*
 * A reader who asked for no motion gets the state change with no wait, matching
 * the stylesheet's own `prefers-reduced-motion` drop.
 */
/*
 * What a Tab press can land on: a stopped control is not a stop, a hidden input
 * is not tabbable, and `[tabindex="-1"]` is dropped as programmatic-only.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

function focusablesWithin(root: HTMLElement | null): HTMLElement[] {
  if (root === null) {
    return [];
  }

  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

interface DialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly actions: ReactNode;
  /** The dialog asks to close; the caller owns `open` and flips it. */
  readonly onRequestClose: () => void;
  /** The exit has finished and the node is gone; the caller clears its state. */
  readonly onClosed?: () => void;
  /** The element to focus on open, so the dialog opens on its task. */
  readonly initialFocus?: React.RefObject<HTMLElement | null>;
}

export default function Dialog({
  open,
  title,
  description,
  children,
  actions,
  onRequestClose,
  onClosed,
  initialFocus
}: DialogProps) {
  const headId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  /* Opening mounts and runs the arrival; closing keeps it mounted while the
   * reverse runs, and a timer at the same duration unmounts it. */
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
      onClosed?.();
      return;
    }

    setClosing(true);

    const exit = window.setTimeout(() => {
      setMounted(false);
      onClosed?.();
    }, EXIT_MS);

    return () => window.clearTimeout(exit);
  }, [open]);

  /* Focus runs when the node mounts, not when `open` flips, and restores the
   * opener on unmount: removing a focused node hands focus to `<body>`. */
  useEffect(() => {
    if (!mounted) {
      return;
    }

    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = dialogRef.current;
    const target =
      initialFocus?.current ?? focusablesWithin(dialog)[0] ?? dialog;

    target?.focus();

    return () => {
      opener?.focus();
    };
  }, [mounted]);

  /* The focusables are read on each Tab, because the body changes while the
   * dialog is open; the ends wrap, and an outside focus is pulled back. */
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onRequestClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;

      if (dialog === null) {
        return;
      }

      const items = focusablesWithin(dialog);

      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onRequestClose]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={styles.scrim}
      style={scrimStyle}
      data-closing={closing ? 'true' : undefined}
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onRequestClose();
        }
      }}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headId}
        aria-describedby={bodyId}
        tabIndex={-1}>
        <div className={styles.dialog__content}>
          <h2 className={styles.dialog__head} id={headId}>
            {title}
          </h2>
          <p className={styles.dialog__body} id={bodyId}>
            {description}
          </p>
          {children}
        </div>
        <div className={styles.dialog__actions}>{actions}</div>
      </div>
    </div>
  );
}
