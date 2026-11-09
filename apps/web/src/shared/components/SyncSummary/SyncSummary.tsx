import { IconCancel } from '@tabler/icons-react';

import { Provider, SyncRunStatus } from '@playliberty/contracts';
import type { SyncRun } from '@playliberty/contracts';
import { formatRelativeTime, providerLabel, useI18n } from '@playliberty/i18n';

import RetryFailedControl from '../RetryFailedControl/RetryFailedControl';
import Spinner from '../Spinner/Spinner';
import styles from './SyncSummary.module.scss';

/*
 * The summary is never drawn beside the sync error, which replaces it. The
 * stamp frames the run's counts; the failed figure is live and says so. Zero
 * cells are hidden, and a run that changed nothing says so.
 */

interface SyncSummaryProps {
  run: SyncRun;
  now: Date;
  /* The playlist's name, which the cancel control names in its accessible
   * label so a page with one band still says what it cancels. */
  playlistName: string;
  /* The whole playlist's failed tracks, the same aggregate the chips draw. */
  failedCount: number;
  /* Stored tracks whose source removed them: the playlist's retention, not the
   * run's, so it survives a run that changed nothing. */
  remoteRemoved: number;
  provider: Provider;
  /* How many of the tracks this client holds are downloading. Passed only while
   * a run is active, because that is the only time the line is drawn. */
  downloadingCount?: number;
  /* Retry every failed track. Absent for a reader, or when the failed view
   * already carries the control. */
  onRetryFailed?: () => void;
  retryingFailed?: boolean;
  /* The running run's only cancel surface. Absent for a reader or a settled
   * run. */
  onCancel?: () => void;
  cancelling?: boolean;
  /* Whether a running run draws its own stamp; the caller may hide it when a
   * control above already names the sync. */
  showRunningStamp?: boolean;
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
  playlistName,
  failedCount,
  remoteRemoved,
  provider,
  downloadingCount = 0,
  onRetryFailed,
  retryingFailed = false,
  onCancel,
  cancelling = false,
  showRunningStamp = true
}: SyncSummaryProps) {
  const { t } = useI18n();
  const finishedAt = run.finishedAt === null ? null : new Date(run.finishedAt);
  const running = run.status === SyncRunStatus.Running;
  const cancelled = run.status === SyncRunStatus.Cancelled;
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
      {running && !showRunningStamp ? null : (
        <p className={styles.syncSummary__stamp}>
          {cancelled
            ? t('syncSummary.cancelled')
            : running
              ? t('syncSummary.syncing')
              : t('syncSummary.lastSync', {
                  time: formatRelativeTime(t, finishedAt ?? now, now)
                })}
        </p>
      )}
      {running && onCancel !== undefined ? (
        <button
          type="button"
          className={styles.syncSummary__cancel}
          aria-label={`${
            cancelling ? t('syncSummary.cancelling') : t('syncSummary.cancel')
          }, ${playlistName}`}
          aria-busy={cancelling ? true : undefined}
          disabled={cancelling}
          onClick={onCancel}>
          {cancelling ? (
            <Spinner />
          ) : (
            <IconCancel
              className={styles.syncSummary__cancelIcon}
              aria-hidden="true"
              focusable="false"
            />
          )}
          {cancelling ? t('syncSummary.cancelling') : t('syncSummary.cancel')}
        </button>
      ) : null}
      {cancelled ? null : cells.length === 0 ? (
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
      {!cancelled && failedCount > 0 && onRetryFailed !== undefined ? (
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
      {remoteRemoved > 0 ? (
        <p className={styles.syncSummary__retained}>
          {t('syncSummary.retained', {
            count: remoteRemoved,
            provider: providerLabel(t, provider)
          })}
        </p>
      ) : null}
    </div>
  );
}
