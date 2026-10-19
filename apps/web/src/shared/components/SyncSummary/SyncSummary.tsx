import { SyncRunStatus } from '@playliberty/contracts';
import type { SyncRun } from '@playliberty/contracts';
import { formatRelativeTime, useI18n } from '@playliberty/i18n';

import RetryFailedControl from '../RetryFailedControl/RetryFailedControl';
import styles from './SyncSummary.module.scss';

/*
 * The summary is never drawn beside the sync error, which replaces it. The
 * stamp frames the run's counts; the failed figure is live and says so. Zero
 * cells are hidden, and a run that changed nothing says so.
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

interface SummaryCell {
  readonly key: string;
  readonly count: number;
  readonly word: string;
  readonly tone?: string;
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
  const keptWord = t('syncSummary.kept', { count: run.retainedCount });
  const addedWord = t('syncSummary.added', { count: run.addedCount });
  const removedWord = t('syncSummary.removed', { count: run.removedCount });
  const failedWord = t('syncSummary.failed', { count: failedCount });
  const cells: SummaryCell[] = [
    { key: 'kept', count: run.retainedCount, word: keptWord },
    { key: 'added', count: run.addedCount, word: addedWord, tone: 'added' },
    {
      key: 'removed',
      count: run.removedCount,
      word: removedWord,
      tone: 'removed'
    },
    { key: 'failed', count: failedCount, word: failedWord, tone: 'failed' }
  ].filter(cell => cell.count > 0);

  return (
    <div className={styles.syncSummary}>
      <p className={styles.syncSummary__stamp}>
        {running
          ? t('syncSummary.syncing')
          : t('syncSummary.lastSync', {
              time: formatRelativeTime(t, finishedAt ?? now, now)
            })}
      </p>
      {cells.length === 0 ? (
        running ? null : (
          <p className={styles.syncSummary__noChanges}>
            {t('syncSummary.noChanges')}
          </p>
        )
      ) : (
        <div className={styles.syncSummary__band}>
          {cells.map(cell => (
            <div
              key={cell.key}
              className={styles.syncSummary__cell}
              role="group"
              aria-label={`${cell.count} ${cell.word}`}>
              <span className={styles.syncSummary__n} data-tone={cell.tone}>
                {cell.count}
              </span>
              <span className={styles.syncSummary__word}>{cell.word}</span>
            </div>
          ))}
        </div>
      )}
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
    </div>
  );
}
