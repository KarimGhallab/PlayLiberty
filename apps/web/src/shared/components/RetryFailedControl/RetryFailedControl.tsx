import { IconRotateClockwise } from '@tabler/icons-react';

import { useI18n } from '@playliberty/i18n';

import Spinner from '../Spinner/Spinner';
import styles from './RetryFailedControl.module.scss';

/* The failed set's one action: the count is both the label and what the press
 * retries, so the label cannot drift from the set. */

interface RetryFailedControlProps {
  readonly count: number;
  readonly retrying: boolean;
  readonly onRetry: () => void;
}

export default function RetryFailedControl({
  count,
  retrying,
  onRetry
}: RetryFailedControlProps) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      className={styles.retryFailed}
      aria-busy={retrying ? true : undefined}
      disabled={retrying}
      onClick={onRetry}>
      {retrying ? (
        <Spinner />
      ) : (
        <IconRotateClockwise
          className={styles.retryFailed__icon}
          aria-hidden="true"
          focusable="false"
        />
      )}
      {retrying
        ? t('detail.retryingFailed', { count })
        : t('detail.retryFailed', { count })}
    </button>
  );
}
