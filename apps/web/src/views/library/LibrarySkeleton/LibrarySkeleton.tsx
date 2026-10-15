import { useI18n } from '@playliberty/i18n';

import styles from './LibrarySkeleton.module.scss';

/*
 * The library's loading state: the shape of the gallery rather than a sentence
 * about waiting. Eight tiles of the item's own geometry, each a square cover with
 * the three lines the tile draws under it, so the read resolves into the space
 * this held and nothing on the page moves when it lands. Eight because that fills
 * the 1056 column's first screen at four columns and two rows.
 *
 * The shapes carry no text, so they are `aria-hidden` and the only thing a screen
 * reader hears is the status sentence, which is why the sentence is still on the
 * page and off screen rather than gone.
 */
const TILES = 8;

export default function LibrarySkeleton() {
  const { t } = useI18n();

  return (
    <div className={styles.librarySkeleton} role="status">
      <span className={styles.librarySkeleton__spoken}>
        {t('library.loading')}
      </span>
      <div className={styles.librarySkeleton__grid} aria-hidden="true">
        {Array.from({ length: TILES }, (_, index) => (
          <div className={styles.librarySkeleton__tile} key={index}>
            <div className={styles.librarySkeleton__cover} />
            <div className={styles.librarySkeleton__body}>
              <div className={styles.librarySkeleton__name} />
              <div className={styles.librarySkeleton__meta} />
              <div className={styles.librarySkeleton__count} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
