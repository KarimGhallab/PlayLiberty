import { IconRotateClockwise } from '@tabler/icons-react';

import { useI18n } from '@playliberty/i18n';

import styles from './EmptyState.module.scss';

/*
 * The empty state: the list area's own state for a playlist that has never
 * synced. It stands in for the list rather than sitting above it, so it is on
 * --bg and not on a --surface panel, and its content is centred within the
 * reading width while the stack itself starts at the top of the area.
 *
 * The promise is its own line in the smallest size, because it is the line doing
 * the most work for the least space: it is the product's whole promise, and an
 * empty state is the one surface where saying it once is not nagging, because
 * there is nothing yet to lose.
 *
 * The action is `Sync now` and it is drawn only when the caller can sync, so a
 * reader who cannot act here is not handed a control that cannot be pressed.
 * The button carries `rotate-clockwise` at --icon-sm at rest and swaps it for
 * the spinner while a sync runs, which is the two-mark form the form controls
 * already draw: the same 16px box either way, so the only width change on press
 * is the label's own.
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
