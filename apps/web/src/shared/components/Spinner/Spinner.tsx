import styles from './Spinner.module.scss';

/*
 * The one spinner: a cut ring in the current colour, sized to the icon box so a
 * control's glyph swap changes only the word beside it.
 */

interface SpinnerProps {
  /** Placement or colour the surface owns. */
  readonly className?: string;
}

export default function Spinner({ className }: SpinnerProps) {
  return (
    <span
      className={
        className === undefined
          ? styles.spinner
          : `${styles.spinner} ${className}`
      }
      aria-hidden="true"
    />
  );
}
