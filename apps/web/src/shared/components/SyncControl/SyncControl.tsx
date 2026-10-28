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
  readonly visibleLabel?: string;
  readonly workingLabel: string;
  readonly working: boolean;
  /* A control the page cannot offer right now, without claiming a run. */
  readonly disabled?: boolean;
  readonly onPress: () => void;
}

export default function SyncControl({
  label,
  visibleLabel,
  workingLabel,
  working,
  disabled = false,
  onPress
}: SyncControlProps) {
  const name = working ? workingLabel : label;
  const words = visibleLabel ?? name;

  return (
    <button
      type="button"
      className={styles.sync}
      aria-label={name}
      aria-busy={working ? true : undefined}
      disabled={working || disabled}
      onClick={onPress}>
      {/* The button is named by its `aria-label`, so what it draws is decoration. */}
      <span className={styles.sync__word} aria-hidden="true">
        {words}
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
