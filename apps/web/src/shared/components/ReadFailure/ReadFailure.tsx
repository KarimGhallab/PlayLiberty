import { useI18n } from '@playliberty/i18n';

import { ApiError } from '../../api/client/client';
import styles from './ReadFailure.module.scss';

/*
 * A blocking read that failed, and the one way back. A surface that would
 * otherwise replace its content with a sentence draws this instead: the sentence,
 * or the server's own `detail` when the error carries one, and a retry that
 * refetches the read that failed. It is one manual press and never a page reload,
 * so a transient fault is a press away from the content it hid.
 */

interface ReadFailureProps {
  /** The fallback sentence, shown when the error carries no detail. */
  readonly message: string;
  /**
   * The failed read's error. It carries the server's own `detail` when it is an
   * `ApiError`, which is the honest cause to show over the fallback.
   */
  readonly error: unknown;
  /** Refetch the read that failed. Never a reload: the one read, one press. */
  readonly onRetry: () => void;
  readonly retrying?: boolean;
}

/** The server's own detail, or null when the error has none to show. */
export function detailFrom(error: unknown): string | null {
  return error instanceof ApiError ? (error.problem?.detail ?? null) : null;
}

export default function ReadFailure({
  message,
  error,
  onRetry,
  retrying = false
}: ReadFailureProps) {
  const { t } = useI18n();

  return (
    <div className={styles.readFailure} role="alert">
      <p className={styles.readFailure__say}>{detailFrom(error) ?? message}</p>
      <button
        type="button"
        className={styles.readFailure__retry}
        onClick={onRetry}
        disabled={retrying}
        aria-busy={retrying ? true : undefined}>
        {retrying ? t('readFailure.retrying') : t('readFailure.retry')}
      </button>
    </div>
  );
}
