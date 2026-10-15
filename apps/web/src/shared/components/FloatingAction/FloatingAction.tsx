import { IconPlus } from '@tabler/icons-react';

import { usePlayerStore } from '../../player/playerStore/playerStore';
import { currentTrack } from '../../player/types';
import styles from './FloatingAction.module.scss';

/*
 * The floating add action: one round button on the frame's bottom-right corner,
 * drawn at the phone width and by neither screen above it, where both name their
 * action in words.
 *
 * It is one component because it is one control at two consumers: the library
 * uses it to add a playlist and the playlist detail to add a track, and the two
 * differ in the label and in nothing else. Both draw it only where they have a
 * control to offer, which is the caller's rule rather than this component's: the
 * library hides it on the empty gallery, whose own action is a framed button, and
 * the detail hides it from a reader who may not write.
 *
 * The button reads the player store itself for the one thing about its
 * surroundings that moves it: the docked bar is an overlay 97px tall, so the
 * button sits above it rather than behind it. That leaves the frame's own
 * clearance for it to each page, because a fixed control's room in the page's
 * padding is the page's business.
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
