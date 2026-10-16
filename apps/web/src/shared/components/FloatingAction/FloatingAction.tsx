import { IconPlus } from '@tabler/icons-react';

import { usePlayerStore } from '../../player/playerStore/playerStore';
import { currentTrack } from '../../player/types';
import styles from './FloatingAction.module.scss';

/*
 * The floating add action: one round button on the frame's bottom-right corner,
 * drawn at the phone width and by neither screen above it. It is one component
 * at two consumers, which differ only in the label.
 */

interface FloatingActionProps {
  /* The accessible name, which is the whole of the button: it draws a plus and no
   * visible word. */
  label: string;
  onClick: () => void;
}

export default function FloatingAction({
  label,
  onClick
}: FloatingActionProps) {
  const docked = usePlayerStore(state => currentTrack(state) !== null);

  return (
    <button
      type="button"
      className={styles.floatingAction}
      data-docked={docked ? 'true' : undefined}
      aria-label={label}
      onClick={onClick}>
      <IconPlus
        className={styles.floatingAction__icon}
        aria-hidden="true"
        focusable="false"
      />
    </button>
  );
}
