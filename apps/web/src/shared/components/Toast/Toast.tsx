import type { ReactNode } from 'react';

import { useI18n } from '@playliberty/i18n';

import styles from './Toast.module.scss';

export type ToastTone = 'accent' | 'success' | 'failed';

export interface ToastAction {
  readonly label: string;
  readonly onAction: () => void;
}

export interface ToastProps {
  readonly message: string;
  readonly detail?: string | null;
  readonly windowKey?: number;
  /** How long this window has left, in milliseconds. Drives the ring. */
  readonly durationMs: number;
  readonly tone?: ToastTone;
  readonly icon?: ReactNode;
  readonly action?: ToastAction;
  /** The countdown sweep. The undo windows keep it; a result toast does not. */
  readonly ring?: boolean;
  readonly onDismiss: () => void;
}

/*
 * The one toast surface: a ring, an optional icon, the sentence and its detail,
 * an optional action, and the dismiss. The host owns the timer and the stack.
 */
export default function Toast({
  message,
  detail = null,
  windowKey = 0,
  durationMs,
  tone = 'accent',
  icon,
  action,
  ring = true,
  onDismiss
}: ToastProps) {
  const { t } = useI18n();

  return (
    <div className={styles.toast} data-tone={tone} role="status">
      {ring ? (
        <span
          key={windowKey}
          className={styles.toast__ring}
          aria-hidden="true"
          style={{ animationDuration: `${durationMs}ms` }}
        />
      ) : null}
      {icon === undefined ? null : (
        <span className={styles.toast__icon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles.toast__body}>
        <span className={styles.toast__title}>{message}</span>
        {detail === null ? null : (
          <span className={styles.toast__detail}>{detail}</span>
        )}
      </span>
      {action === undefined ? null : (
        <button
          type="button"
          className={styles.toast__action}
          onClick={action.onAction}>
          {action.label}
        </button>
      )}
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
