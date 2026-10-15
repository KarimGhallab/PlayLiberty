import { useEffect, useRef } from 'react';

import { useI18n } from '@playliberty/i18n';

import styles from './LoadMoreControl.module.scss';

/*
 * The foot of a paged list: the reader's reach loads the next page, and the button
 * is the control that does the same thing on purpose. The sentinel is its own
 * element rather than the button, so the observer is not tied to the button's box
 * and the button keeps its ordinary meaning; it is hidden from assistive
 * technology because the button is the one announcement.
 *
 * A failed page turns the button into the retry rather than adding a second
 * surface: the page that failed is the page this control asked for, so this is the
 * control that asks again. There is no "all loaded" state here; the caller draws
 * nothing once the list is whole.
 *
 * The observer is created only where the platform has one. A test environment and
 * any browser without it simply get the button, which is the control the list
 * owes the reader either way.
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
