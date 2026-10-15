import { useI18n } from '@playliberty/i18n';

import styles from './LibrarySkeleton.module.scss';

/*
 * The library's loading state: the shape of the gallery rather than a sentence
 * about waiting. Eight of the item's own geometry, each a square cover with the
 * lines the item draws under it, so the read resolves into the space this held and
 * nothing on the page moves when it lands. Eight because that fills the 1056
 * column's first screen at four columns and two rows.
 *
 * The shape is the arrangement's, because the item's is: the tile's cover with
 * three lines under it above the phone breakpoint, and the card's picture with the
 * two lines of its status under it at it and below, in the same grid either way.
 *
 * The shapes carry no text, so they are `aria-hidden` and the only thing a screen
 * reader hears is the status sentence, which is why the sentence is still on the
 * page and off screen rather than gone.
 */
const ITEMS = 8;

interface LibrarySkeletonProps {
  /* Which arrangement the page's width asks for. */
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
