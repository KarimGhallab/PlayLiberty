import { SyncRunStatus } from '@playliberty/contracts';
import type { SyncRun } from '@playliberty/contracts';
import { formatLastSynced } from '@playliberty/ui-foundation';

import styles from './SyncSummary.module.scss';

/*
 * The sync summary: the four figures a run produced, and the time it finished.
 * It sits under the playlist header in the detail's left column and is never
 * drawn beside the sync error, which replaces it: the summary says what the run
 * did and the error says what to do about it, and the two would put the same
 * news in the same column twice.
 *
 * The band is four equal cells, one figure and one word each, both centred. The
 * four counts are the run's own, so a playlist with no run has no summary and
 * renders nothing at all rather than four zeroes: a summary of a run that never
 * happened is a claim about the last run that there was not one.
 *
 * The figure is quiet by default and colour is spent only on a count that is
 * not zero, so a run that changed nothing needs no reading at all. The stamp is
 * the run's `finishedAt`, which a running run does not have yet, so a run still
 * in flight draws its own word in place of the stamp.
 *
 * The in-flight line is derived, and says so. There is no stored pending count
 * anywhere in the contract, so while a run is active the downloading figure
 * comes from the tracks the client already holds and the surface states that
 * rather than presenting a number the server never reported.
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
  const finishedAt = run.finishedAt === null ? null : new Date(run.finishedAt);
  const running = run.status === SyncRunStatus.Running;
  const toneOf = (count: number, tone: string): string | undefined =>
    count === 0 ? undefined : tone;

  return (
    <div className={styles.syncSummary}>
      <div className={styles.syncSummary__band}>
        <div className={styles.syncSummary__cell}>
          <span className={styles.syncSummary__n}>{run.retainedCount}</span>
          <span className={styles.syncSummary__word}>kept</span>
        </div>
        <div className={styles.syncSummary__cell}>
          <span
            className={styles.syncSummary__n}
            data-tone={toneOf(run.addedCount, 'added')}>
            {run.addedCount}
          </span>
          <span className={styles.syncSummary__word}>added</span>
        </div>
        <div className={styles.syncSummary__cell}>
          <span
            className={styles.syncSummary__n}
            data-tone={toneOf(run.removedCount, 'removed')}>
            {run.removedCount}
          </span>
          <span className={styles.syncSummary__word}>removed</span>
        </div>
        <div className={styles.syncSummary__cell}>
          <span
            className={styles.syncSummary__n}
            data-tone={toneOf(run.failedCount, 'failed')}>
            {run.failedCount}
          </span>
          <span className={styles.syncSummary__word}>failed</span>
        </div>
      </div>
      {running && downloadingCount > 0 ? (
        <p className={styles.syncSummary__flight}>
          {downloadingCount} downloading, counted from the tracks this client
          holds
        </p>
      ) : null}
      <p className={styles.syncSummary__stamp}>
        {running
          ? 'Syncing'
          : finishedAt === null
            ? 'Synced just now'
            : formatLastSynced(finishedAt, now)}
      </p>
    </div>
  );
}
