import { IconRotate } from '@tabler/icons-react';

import Spinner from '../Spinner/Spinner';
import styles from './SyncControl.module.scss';

/*
 * The sync action's one shape: the caller's label states the scope, and the
 * glyph rests as a square where a pointer can hover while the words come out on
 * hover, focus, or during the run. The gallery starts a bulk sync with it and
 * the detail starts the current playlist's.
 */

interface SyncControlProps {
  readonly label: string;
  readonly workingLabel: string;
  readonly working: boolean;
  /* A control the page cannot offer right now, without claiming a run. */
  readonly disabled?: boolean;
  readonly onPress: () => void;
}

export default function SyncControl({
  label,
  workingLabel,
  working,
  disabled = false,
  onPress
}: SyncControlProps) {
  const shown = working ? workingLabel : label;

  return (
    <button
      type="button"
      className={styles.sync}
      aria-label={shown}
      aria-busy={working ? true : undefined}
      disabled={working || disabled}
      onClick={onPress}>
      {/* The name is the label, so the copy the pill clips is decoration. */}
      <span className={styles.sync__word} aria-hidden="true">
        {shown}
      </span>
      <span className={styles.sync__glyph}>
        {working ? (
          <Spinner />
        ) : (
          <IconRotate
            className={styles.sync__icon}
            aria-hidden="true"
            focusable="false"
          />
        )}
      </span>
    </button>
  );
}
