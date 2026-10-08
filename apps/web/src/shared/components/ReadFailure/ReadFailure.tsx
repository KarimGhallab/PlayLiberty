import type { Problem } from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';

import { ApiError } from '../../api/client/client';
import styles from './ReadFailure.module.scss';

/*
 * A blocking read that failed, and the one way back. A surface that would
 * otherwise replace its content with a sentence draws this instead: the sentence
 * the problem maps to (the server's own `detail` for a code this client does not
 * know), and a retry that refetches the read that failed. It is one manual press
 * and never a page reload, so a transient fault is a press away from the content
 * it hid.
 */

interface ReadFailureProps {
  /** The fallback sentence, shown when the error maps to no problem sentence. */
  readonly message: string;
  /**
   * The failed read's error. Its problem is what the sentence is read from when
   * it is an `ApiError`.
   */
  readonly error: unknown;
  /** Refetch the read that failed. Never a reload: the one read, one press. */
  readonly onRetry: () => void;
  readonly retrying?: boolean;
}

/** The problem the error carries, or null when it is not an `ApiError`. */
function problemFrom(error: unknown): Problem | null {
  return error instanceof ApiError ? error.problem : null;
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
      <p className={styles.readFailure__say}>
        {problemDetail(t, problemFrom(error)) ?? message}
      </p>
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
