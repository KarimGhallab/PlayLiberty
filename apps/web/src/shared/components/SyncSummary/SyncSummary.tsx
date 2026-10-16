import { SyncRunStatus } from '@playliberty/contracts';
import type { SyncRun } from '@playliberty/contracts';
import { formatLastSynced, useI18n } from '@playliberty/i18n';

import styles from './SyncSummary.module.scss';

/*
 * The summary is never drawn beside the sync error, which replaces it, and a
 * playlist with no run renders nothing rather than four zeroes. The in-flight
 * downloading figure is derived client-side, since no pending count is stored.
 */

interface SyncSummaryProps {
  run: SyncRun;
  now: Date;
  /* How many of the tracks this client holds are downloading. Passed only while
   * a run is active, because that is the only time the line is drawn. */
  downloadingCount?: number;
}

export default function SyncSummary({
  run,
  now,
  downloadingCount = 0
}: SyncSummaryProps) {
  const { t } = useI18n();
  const finishedAt = run.finishedAt === null ? null : new Date(run.finishedAt);
  const running = run.status === SyncRunStatus.Running;
  const toneOf = (count: number, tone: string): string | undefined =>
    count === 0 ? undefined : tone;

  return (
    <div className={styles.syncSummary}>
      <div className={styles.syncSummary__band}>
        <div className={styles.syncSummary__cell}>
          <span className={styles.syncSummary__n}>{run.retainedCount}</span>
          <span className={styles.syncSummary__word}>
            {t('syncSummary.kept', { count: run.retainedCount })}
          </span>
        </div>
        <div className={styles.syncSummary__cell}>
          <span
            className={styles.syncSummary__n}
            data-tone={toneOf(run.addedCount, 'added')}>
            {run.addedCount}
          </span>
          <span className={styles.syncSummary__word}>
            {t('syncSummary.added', { count: run.addedCount })}
          </span>
        </div>
        <div className={styles.syncSummary__cell}>
          <span
            className={styles.syncSummary__n}
            data-tone={toneOf(run.removedCount, 'removed')}>
            {run.removedCount}
          </span>
          <span className={styles.syncSummary__word}>
            {t('syncSummary.removed', { count: run.removedCount })}
          </span>
        </div>
        <div className={styles.syncSummary__cell}>
          <span
            className={styles.syncSummary__n}
            data-tone={toneOf(run.failedCount, 'failed')}>
            {run.failedCount}
          </span>
          <span className={styles.syncSummary__word}>
            {t('syncSummary.failed', { count: run.failedCount })}
          </span>
        </div>
      </div>
      {running && downloadingCount > 0 ? (
        <p className={styles.syncSummary__flight}>
          {t('syncSummary.downloading', { count: downloadingCount })}
        </p>
      ) : null}
      <p className={styles.syncSummary__stamp}>
        {running
          ? t('syncSummary.syncing')
          : finishedAt === null
            ? t('syncSummary.syncedJustNow')
            : formatLastSynced(t, finishedAt, now)}
      </p>
    </div>
  );
}
