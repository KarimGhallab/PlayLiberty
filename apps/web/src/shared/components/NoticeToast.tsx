import styles from './NoticeToast.module.scss';

/*
 * A transient notice with nothing to press. It is the shuffle refusal's surface:
 * the control was pressed and did nothing, and this says why, in the slot the
 * volume notice already uses, centred above the player bar. It never blocks, and
 * it withdraws itself, so a refusal does not grow a control for the notice to be
 * dismissed with.
 *
 * Its whole life is one animation: a short rise in and a fade at the end, so the
 * removal the host performs is not a pop. `forwards` holds the faded frame until
 * the host unmounts it, and `prefers-reduced-motion` drops the animation so the
 * sentence simply shows and is disposed on the host's clock.
 */

interface NoticeToastProps {
  /** The sentence, naming what was pressed. */
  readonly message: string;
  /** The line under it, saying why it did nothing. */
  readonly detail?: string | null;
  /** How long the notice stands, in milliseconds. Drives the fade. */
  readonly durationMs: number;
}

export default function NoticeToast({
  message,
  detail = null,
  durationMs
}: NoticeToastProps) {
  return (
    <div
      className={styles.notice}
      role="status"
      style={{ animationDuration: `${durationMs}ms` }}>
      <span className={styles.notice__body}>
        <span className={styles.notice__title}>{message}</span>
        {detail === null ? null : (
          <span className={styles.notice__detail}>{detail}</span>
        )}
      </span>
    </div>
  );
}
