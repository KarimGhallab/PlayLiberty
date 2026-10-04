import styles from './UndoToast.module.scss';

/*
 * The undo toast, the one transient notice the app draws. It is the deferred
 * action's surface: an action that the server has not been asked to perform yet
 * sits here for a few seconds with the one control that stops it. It is anchored
 * bottom-left, opposite the player bar's own controls, and it never blocks: it
 * carries no scrim and no focus trap, because it is a notice with one press and
 * not a dialog.
 *
 * The countdown ring is the window made visible. It is decorative and
 * `aria-hidden`, because a screen reader reading seconds would be a number that
 * changes with no action behind it; the sentence and the control are the whole
 * of what it announces.
 */

interface UndoToastProps {
  /** The sentence, in the present tense, e.g. `Deleting “Evening Jazz”`. */
  readonly message: string;
  /** The line under it, e.g. the playlist or track name. */
  readonly detail?: string | null;
  /** How long the window lasts, in milliseconds. Drives the ring. */
  readonly durationMs: number;
  /** The control's own word, `Cancel` or `Undo`. */
  readonly actionLabel: string;
  readonly onAction: () => void;
  readonly onDismiss: () => void;
}

export default function UndoToast({
  message,
  detail = null,
  durationMs,
  actionLabel,
  onAction,
  onDismiss
}: UndoToastProps) {
  return (
    <div className={styles.toast} role="status">
      <span
        className={styles.toast__ring}
        aria-hidden="true"
        style={{ animationDuration: `${durationMs}ms` }}
      />
      <span className={styles.toast__body}>
        <span className={styles.toast__title}>{message}</span>
        {detail === null ? null : (
          <span className={styles.toast__detail}>{detail}</span>
        )}
      </span>
      <button type="button" className={styles.toast__action} onClick={onAction}>
        {actionLabel}
      </button>
      <button
        type="button"
        className={styles.toast__dismiss}
        aria-label="Dismiss"
        onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
