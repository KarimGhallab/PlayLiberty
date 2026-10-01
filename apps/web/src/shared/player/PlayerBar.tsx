import { formatDuration } from '@playliberty/ui-foundation';

import styles from './PlayerBar.module.scss';
import { usePlayerStore } from './playerStore';

/*
 * The bar is the shell's only persistent chrome. This scaffold renders the
 * current title, its position and a play/pause control and nothing else; the
 * real bar, its queue panel and its states belong to a feature ticket.
 */
export default function PlayerBar() {
  const current = usePlayerStore(
    state => state.queue.find(track => track.id === state.currentId) ?? null
  );
  const positionSeconds = usePlayerStore(state => state.positionSeconds);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const setPlaying = usePlayerStore(state => state.setPlaying);

  return (
    <footer className={styles.playerBar} aria-label="Player">
      <span className={styles.playerBar__title}>
        {current?.title ?? 'Nothing playing'}
      </span>
      {current === null ? null : (
        <span className={styles.playerBar__position}>
          {formatDuration(positionSeconds)}
        </span>
      )}
      <button
        type="button"
        className={styles.playerBar__control}
        onClick={() => setPlaying(!isPlaying)}
        disabled={current === null}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </footer>
  );
}
