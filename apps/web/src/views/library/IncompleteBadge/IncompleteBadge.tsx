import { IconDownload } from '@tabler/icons-react';

import { TrackFileStatus } from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import styles from './IncompleteBadge.module.scss';

/*
 * The sync state cannot carry this: a run that finished hours ago leaves a
 * playlist reading "Up to date" with four failed tracks. The counts group by
 * file status alone, so a stored file whose video was removed is stored.
 *
 * A track whose video was gone before storage is not a download that can still
 * finish. It is counted apart, in the muted role, with no glyph.
 */

type Shortfall =
  | TrackFileStatus.Pending
  | TrackFileStatus.Downloading
  | TrackFileStatus.Failed;

interface MissingState {
  readonly state: Shortfall;
  readonly labelKey: MessageKey<Messages>;
}

/* Listed in the order a person wants them: what is coming, then what is wrong. */
const MISSING: readonly MissingState[] = [
  { state: TrackFileStatus.Pending, labelKey: 'trackState.pending' },
  { state: TrackFileStatus.Downloading, labelKey: 'trackState.downloading' },
  { state: TrackFileStatus.Failed, labelKey: 'trackState.failed' }
];

/* Worst wins, because a break is louder news than a wait. */
const SEVERITY: readonly Shortfall[] = [
  TrackFileStatus.Failed,
  TrackFileStatus.Downloading,
  TrackFileStatus.Pending
];

interface IncompleteBadgeProps {
  counts: TrackFileStatusCounts | null;
  /* Whether the breakdown keeps its 180px floor or opens compact from the
   * pill's start. */
  tipEdge?: 'start' | 'compact';
}

export default function IncompleteBadge({
  counts,
  tipEdge = 'start'
}: IncompleteBadgeProps) {
  const { t } = useI18n();

  if (counts === null) {
    return null;
  }

  const rows = MISSING.filter(entry => counts[entry.state] > 0).map(entry => ({
    state: entry.state,
    labelKey: entry.labelKey,
    count: counts[entry.state]
  }));
  const terminal = counts[TrackFileStatus.Unavailable];

  if (rows.length === 0 && terminal === 0) {
    return null;
  }

  const missing = rows.reduce((sum, row) => sum + row.count, 0);
  const tone = SEVERITY.find(state => rows.some(row => row.state === state));

  /*
   * A `role="img"`'s children are not read out, so the breakdown rides in the
   * label; the middot is this system's separator between two facts on one line.
   */
  const label = [
    t('library.notDownloaded', { count: missing }),
    ...rows.map(row => `${t(row.labelKey)} ${row.count}`)
  ].join(' · ');

  return (
    <>
      {tone === undefined ? null : (
        <span
          className={styles.incompleteBadge}
          data-tone={tone}
          data-tip={tipEdge}
          role="img"
          aria-label={label}>
          <IconDownload
            className={styles.incompleteBadge__icon}
            aria-hidden="true"
            focusable="false"
          />
          <span className={styles.incompleteBadge__count}>{missing}</span>
          <span className={styles.incompleteBadge__tip} role="presentation">
            {rows.map(row => (
              <span
                key={row.state}
                className={styles.incompleteBadge__row}
                data-tone={row.state}>
                <span
                  className={styles.incompleteBadge__dot}
                  aria-hidden="true"
                />
                <span className={styles.incompleteBadge__word}>
                  {t(row.labelKey)}
                </span>
                <span className={styles.incompleteBadge__value}>
                  {row.count}
                </span>
              </span>
            ))}
          </span>
        </span>
      )}
      {terminal === 0 ? null : (
        <span className={styles.neverStored}>
          {`${t('trackState.unavailableChip', { count: terminal })} ${terminal}`}
        </span>
      )}
    </>
  );
}
