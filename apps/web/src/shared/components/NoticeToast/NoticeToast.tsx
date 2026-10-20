import styles from './NoticeToast.module.scss';

/*
 * A transient notice with nothing to press: the shuffle refusal's surface. It
 * never blocks and withdraws itself, so a refusal does not grow a control to
 * dismiss it.
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
