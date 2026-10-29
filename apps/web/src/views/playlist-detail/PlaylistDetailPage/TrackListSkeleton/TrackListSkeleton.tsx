import { useI18n } from '@playliberty/i18n';

import styles from './TrackListSkeleton.module.scss';

/*
 * The row's own geometry held open while the list pages in to its current track,
 * so the read resolves where it lands rather than at the top.
 */
const ROWS = 8;

export default function TrackListSkeleton() {
  const { t } = useI18n();

  return (
    <div className={styles.trackListSkeleton} role="status">
      <span className={styles.trackListSkeleton__spoken}>
        {t('detail.loadingTracks')}
      </span>
      <ul className={styles.trackListSkeleton__list} aria-hidden="true">
        {Array.from({ length: ROWS }, (_, index) => (
          <li className={styles.trackListSkeleton__row} key={index}>
            <span className={styles.trackListSkeleton__art} />
            <span className={styles.trackListSkeleton__body}>
              <span className={styles.trackListSkeleton__title} />
              <span className={styles.trackListSkeleton__meta} />
            </span>
            <span className={styles.trackListSkeleton__duration} />
            <span className={styles.trackListSkeleton__lane} />
          </li>
        ))}
      </ul>
    </div>
  );
}
