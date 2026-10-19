import { useI18n } from '@playliberty/i18n';

import styles from './UndoToast.module.scss';

/*
 * The deferred action's surface: an action the server has not yet been asked to
 * perform, with the one control that stops it. It never blocks: no scrim and no
 * focus trap.
 */

interface UndoToastProps {
  /** The sentence, in the present tense, e.g. `Deleting “Evening Jazz”`. */
  readonly message: string;
  readonly detail?: string | null;
  readonly windowKey?: number;
  /** How long this window has left, in milliseconds. Drives the ring. */
  readonly durationMs: number;
  /** The control's own word, `Cancel` or `Undo`. */
  readonly actionLabel: string;
  readonly onAction: () => void;
  readonly onDismiss: () => void;
}

export default function UndoToast({
  message,
  detail = null,
  windowKey = 0,
  durationMs,
  actionLabel,
  onAction,
  onDismiss
}: UndoToastProps) {
  const { t } = useI18n();

  return (
    <div className={styles.toast} role="status">
      <span
        key={windowKey}
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
        aria-label={t('toast.dismiss')}
        onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
