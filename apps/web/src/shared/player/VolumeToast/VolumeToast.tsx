import { useI18n } from '@playliberty/i18n';

import { volumeIcon } from '../volumeIcon';
import styles from './VolumeToast.module.scss';

/*
 * The volume notice: a short readout of the level the keyboard just set, shown
 * because the rail is visible only under the pointer. A HUD, not a dialog: no
 * scrim, no focus, no pointer events, and no entrance to replay on a press.
 */

interface VolumeToastProps {
  readonly volume: number;
  readonly muted: boolean;
  /** How long it stays, in ms. Drives the fade and the host's timer. */
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
