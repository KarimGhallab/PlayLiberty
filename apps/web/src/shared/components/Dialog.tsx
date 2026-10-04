import { useEffect, useId, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import styles from './Dialog.module.scss';

/*
 * The one dialog shell: a scrim over the page, a 400px card on --surface-raised
 * with a --control-border edge, a title, a body and an action row. Every dialog
 * in the app is this node with different children, so the arrival and exit are
 * written once rather than once per dialog.
 *
 * Two callbacks, because closing is two moments. `onRequestClose` is the dialog
 * asking to go away (Cancel, Escape, a press on the scrim) and the caller decides:
 * it flips `open` false and the exit runs. `onClosed` is the fact that the exit has
 * finished and the node is gone, which is when the caller clears anything it was
 * holding. One callback could not serve both without either reporting twice or
 * stranding the exit, so the split is the contract.
 *
 * `open` drives a two-phase presence rather than a mount. The dialog stays mounted
 * through its exit so the fade can run, and unmounts when that duration has
 * elapsed. A caller that flipped `open` false and tore the node down in the same
 * turn would have no exit at all, so the node's life is this component's.
 *
 * The exit duration is one number, `EXIT_MS`, set as `--dialog-motion` on the
 * scrim so the CSS animation and the unmount timer cannot drift. The timer is what
 * ends the exit, not `animationend`, because a browser that suppresses the
 * animation (reduced motion, or a tab that never composites) may never fire that
 * event, and a dialog that only unmounts on an event is a dialog that can strand
 * itself over the page.
 */

/** `--motion-base`, 180ms. The one place this component names a time. */
const EXIT_MS = 180;

const scrimStyle = {
  '--dialog-motion': `${EXIT_MS}ms`
} as CSSProperties;

/*
 * A reader who asked for no motion gets the state change with no wait and no
 * animation. The base stylesheet drops the animation under `prefers-reduced-
 * motion`, so the component checks the same preference and closes at once.
 */
function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  /*
   * Presence is two phases. Opening mounts the node and runs the arrival; closing
   * keeps it mounted while the reverse runs, and a timer at the same duration is
   * what unmounts it. A dialog that was never open stays unmounted, so an unseen
   * node never paints a frame at full opacity.
   */
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

  /*
   * Focus runs when the node actually mounts, not when `open` flips, because the
   * first render with `open` true returns null until `mounted` catches up. Focus
   * is restored by the unmount, which returns it to whichever control opened it.
   */
  useEffect(() => {
    if (mounted) {
      initialFocus?.current?.focus();
    }
  }, [mounted]);

  /*
   * Escape asks to close, from anywhere in the dialog, which is what a modal is
   * expected to do and the only keyboard path back out.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onRequestClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

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
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headId}
        aria-describedby={bodyId}>
        <h3 className={styles.dialog__head} id={headId}>
          {title}
        </h3>
        <p className={styles.dialog__body} id={bodyId}>
          {description}
        </p>
        {children}
        <div className={styles.dialog__actions}>{actions}</div>
      </div>
    </div>
  );
}
