import { SyncRunStatus } from '@playliberty/contracts';
import type { SyncRun } from '@playliberty/contracts';
import { formatRelativeTime, useI18n } from '@playliberty/i18n';

import RetryFailedControl from '../RetryFailedControl/RetryFailedControl';
import styles from './SyncSummary.module.scss';

/*
 * The summary is never drawn beside the sync error, which replaces it, and a
 * playlist with no run renders nothing rather than four zeroes. The failure
 * figure is the playlist's live count, since downloads settle after the run.
 */

interface SyncSummaryProps {
  run: SyncRun;
  now: Date;
  /* The whole playlist's failed tracks, the same aggregate the chips draw. */
  failedCount: number;
  /* How many of the tracks this client holds are downloading. Passed only while
   * a run is active, because that is the only time the line is drawn. */
  downloadingCount?: number;
  /* Retry every failed track. Absent for a reader, or when the failed view
   * already carries the control. */
  onRetryFailed?: () => void;
  retryingFailed?: boolean;
}

export default function SyncSummary({
  run,
  now,
  failedCount,
  downloadingCount = 0,
  onRetryFailed,
  retryingFailed = false
}: SyncSummaryProps) {
  const { t } = useI18n();
  const finishedAt = run.finishedAt === null ? null : new Date(run.finishedAt);
  const running = run.status === SyncRunStatus.Running;
  const toneOf = (count: number, tone: string): string | undefined =>
    count === 0 ? undefined : tone;
  const keptWord = t('syncSummary.kept', { count: run.retainedCount });
  const addedWord = t('syncSummary.added', { count: run.addedCount });
  const removedWord = t('syncSummary.removed', { count: run.removedCount });
  const failedWord = t('syncSummary.failed', { count: failedCount });

  return (
    <div className={styles.syncSummary}>
      <div className={styles.syncSummary__band}>
        <div
          className={styles.syncSummary__cell}
          role="group"
          aria-label={`${run.retainedCount} ${keptWord}`}>
          <span className={styles.syncSummary__n}>{run.retainedCount}</span>
          <span className={styles.syncSummary__word}>{keptWord}</span>
        </div>
        <div
          className={styles.syncSummary__cell}
          role="group"
          aria-label={`${run.addedCount} ${addedWord}`}>
          <span
            className={styles.syncSummary__n}
            data-tone={toneOf(run.addedCount, 'added')}>
            {run.addedCount}
          </span>
          <span className={styles.syncSummary__word}>{addedWord}</span>
        </div>
        <div
          className={styles.syncSummary__cell}
          role="group"
          aria-label={`${run.removedCount} ${removedWord}`}>
          <span
            className={styles.syncSummary__n}
            data-tone={toneOf(run.removedCount, 'removed')}>
            {run.removedCount}
          </span>
          <span className={styles.syncSummary__word}>{removedWord}</span>
        </div>
        <div
          className={styles.syncSummary__cell}
          role="group"
          aria-label={`${failedCount} ${failedWord}`}>
          <span
            className={styles.syncSummary__n}
            data-tone={toneOf(failedCount, 'failed')}>
            {failedCount}
          </span>
          <span className={styles.syncSummary__word}>{failedWord}</span>
        </div>
      </div>
      {failedCount > 0 && onRetryFailed !== undefined ? (
        <RetryFailedControl
          count={failedCount}
          retrying={retryingFailed}
          onRetry={onRetryFailed}
        />
      ) : null}
      {running && downloadingCount > 0 ? (
        <p className={styles.syncSummary__flight}>
          {t('syncSummary.downloading', { count: downloadingCount })}
        </p>
      ) : null}
      <p className={styles.syncSummary__stamp}>
        {running
          ? t('syncSummary.syncing')
          : t('syncSummary.lastSync', {
              time: formatRelativeTime(t, finishedAt ?? now, now)
            })}
      </p>
    </div>
  );
}
