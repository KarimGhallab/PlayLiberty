import { IconRotateClockwise } from '@tabler/icons-react';

import { useI18n } from '@playliberty/i18n';

import styles from './EmptyState.module.scss';

/*
 * The empty state: the list area's own state for a playlist that has never
 * synced, drawing `Sync now` only when the caller can sync. The promise is its
 * own line in the smallest size, since it is the product's whole promise.
 */

interface EmptyStateProps {
  onSync?: () => void;
  syncing?: boolean;
}

export default function EmptyState({
  onSync,
  syncing = false
}: EmptyStateProps) {
  const { t } = useI18n();

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyState__text}>
        <h2 className={styles.emptyState__head}>{t('emptyState.heading')}</h2>
        <p className={styles.emptyState__prose}>{t('emptyState.prose')}</p>
        <p className={styles.emptyState__promise}>{t('emptyState.promise')}</p>
      </div>
      {onSync === undefined ? null : (
        <button
          type="button"
          className={styles.emptyState__button}
          data-loading={syncing ? 'true' : undefined}
          aria-busy={syncing ? true : undefined}
          onClick={onSync}
          disabled={syncing}>
          {syncing ? (
            <span className={styles.emptyState__spinner} aria-hidden="true" />
          ) : (
            <IconRotateClockwise
              className={styles.emptyState__buttonIcon}
              aria-hidden="true"
              focusable="false"
            />
          )}
          {syncing ? t('emptyState.syncing') : t('emptyState.sync')}
        </button>
      )}
    </div>
  );
}
