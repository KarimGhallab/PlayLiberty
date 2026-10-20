import { useI18n } from '@playliberty/i18n';

import styles from './LibrarySkeleton.module.scss';

/*
 * The shape of the gallery rather than a sentence about waiting, so the read
 * resolves into the space this held and nothing moves when it lands.
 */
/* Eight fills the column's first screen at four columns and two rows. */
const ITEMS = 8;

interface LibrarySkeletonProps {
  layout: 'tile' | 'card';
}

export default function LibrarySkeleton({ layout }: LibrarySkeletonProps) {
  const { t } = useI18n();

  return (
    <div className={styles.librarySkeleton} role="status">
      <span className={styles.librarySkeleton__spoken}>
        {t('library.loading')}
      </span>
      <div className={styles.librarySkeleton__grid} aria-hidden="true">
        {Array.from({ length: ITEMS }, (_, index) =>
          layout === 'card' ? (
            <div className={styles.librarySkeleton__card} key={index}>
              <div className={styles.librarySkeleton__picture} />
              <div className={styles.librarySkeleton__cardBody}>
                <div className={styles.librarySkeleton__name} />
                <div className={styles.librarySkeleton__status} />
              </div>
            </div>
          ) : (
            <div className={styles.librarySkeleton__tile} key={index}>
              <div className={styles.librarySkeleton__cover} />
              <div className={styles.librarySkeleton__body}>
                <div className={styles.librarySkeleton__name} />
                <div className={styles.librarySkeleton__meta} />
                <div className={styles.librarySkeleton__count} />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
