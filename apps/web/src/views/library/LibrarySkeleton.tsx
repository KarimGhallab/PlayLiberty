import styles from './LibrarySkeleton.module.scss';

/*
 * The library's loading state: the shape of the list rather than a sentence
 * about waiting. Five rows of the item's own 136px, each a 96px cover and the
 * two lines the header draws, so the read resolves into the space this held and
 * nothing on the page moves when it lands. Five because that is what fills the
 * 1056 column's first screen.
 *
 * The shapes carry no text, so they are `aria-hidden` and the only thing a
 * screen reader hears is the status sentence, which is why the sentence is
 * still on the page and off screen rather than gone.
 */
const ROWS = 5;

export default function LibrarySkeleton() {
  return (
    <div className={styles.librarySkeleton} role="status">
      <span className={styles.librarySkeleton__spoken}>Loading playlists.</span>
      <div className={styles.librarySkeleton__rows} aria-hidden="true">
        {Array.from({ length: ROWS }, (_, index) => (
          <div className={styles.librarySkeleton__row} key={index}>
            <div className={styles.librarySkeleton__cover} />
            <div className={styles.librarySkeleton__body}>
              <div className={styles.librarySkeleton__name} />
              <div className={styles.librarySkeleton__meta} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
