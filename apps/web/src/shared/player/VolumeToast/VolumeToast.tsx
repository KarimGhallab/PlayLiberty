import { useI18n } from '@playliberty/i18n';

import { volumeIcon } from '../volumeIcon';
import styles from './VolumeToast.module.scss';

/*
 * The volume notice, a short-lived readout of the level the keyboard just set,
 * because the rail is the only other place the level is shown and the rail is
 * open only while the pointer is on it. It is centred above the player bar so it
 * clears the rail at the right corner and the undo toast at the left.
 *
 * It is a HUD and not a dialog: no scrim, no focus, nothing to press, and
 * `pointer-events: none` so it never stands between the pointer and the bar. It
 * appears at full strength rather than sliding in, because a held Up or Down
 * restarts it and an entrance replayed on every press would flicker; the only
 * motion is the fade at the end of its life.
 *
 * The host owns the lifetime: `durationMs` is the animation's duration and the
 * timeout that disposes this instance, handed in so the fade and the removal
 * cannot drift. A new press disposes this instance and mounts a fresh one, which
 * is what keeps a single notice on screen with the level in step.
 */

interface VolumeToastProps {
  readonly volume: number;
  readonly muted: boolean;
  /** How long it stays, in milliseconds. Drives the fade and the host's timer. */
  readonly durationMs: number;
}

export default function VolumeToast({
  volume,
  muted,
  durationMs
}: VolumeToastProps) {
  const { t } = useI18n();
  const percent = Math.round(volume * 100);
  const Icon = volumeIcon(volume, muted);

  return (
    <div
      className={styles.toast}
      role="status"
      style={{ animationDuration: `${durationMs}ms` }}>
      <Icon
        className={styles.toast__icon}
        aria-hidden="true"
        focusable="false"
      />
      <span className={styles.toast__meter} aria-hidden="true">
        <span
          className={styles.toast__fill}
          data-muted={muted ? 'true' : undefined}
          style={{ width: `${percent}%` }}
        />
      </span>
      {/* The number is drawn, and the sentence beside it is what a reader hears:
          a bare figure in a live region would be announced without its unit. */}
      <span className={styles.toast__value} aria-hidden="true">
        {percent}
      </span>
      <span className={styles.toast__spoken}>
        {muted
          ? t('volume.noticeMuted', { percent })
          : t('volume.notice', { percent })}
      </span>
    </div>
  );
}
