import { useEffect, useRef } from 'react';

import { useI18n } from '@playliberty/i18n';

import styles from './LoadMoreControl.module.scss';

/*
 * The foot of a paged list: the reader's reach loads the next page, and the
 * button does the same on purpose. The sentinel is its own element, hidden from
 * AT since the button is the one announcement. A failed page turns it to retry.
 */

export interface LoadMoreControlProps {
  readonly loading: boolean;
  readonly failed: boolean;
  readonly onLoadMore: () => void;
}

export default function LoadMoreControl({
  loading,
  failed,
  onLoadMore
}: LoadMoreControlProps) {
  const { t } = useI18n();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (
      sentinel === null ||
      loading ||
      failed ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        onLoadMore();
      }
    });

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [loading, failed, onLoadMore]);

  const label = failed
    ? t('detail.loadMoreRetry')
    : loading
      ? t('detail.loadMoreLoading')
      : t('detail.loadMore');

  return (
    <div className={styles.loadMore}>
      <div
        ref={sentinelRef}
        className={styles.loadMore__sentinel}
        aria-hidden="true"
      />
      <button
        type="button"
        className={styles.loadMore__button}
        disabled={loading}
        onClick={onLoadMore}>
        {label}
      </button>
    </div>
  );
}
