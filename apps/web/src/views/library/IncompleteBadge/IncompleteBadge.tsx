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
 */

interface MissingState {
  readonly state: TrackFileStatus;
  readonly labelKey: MessageKey<Messages>;
}

/* Listed in the order a person wants them: what is coming, then what is wrong. */
const MISSING: readonly MissingState[] = [
  { state: TrackFileStatus.Pending, labelKey: 'trackState.pending' },
  { state: TrackFileStatus.Downloading, labelKey: 'trackState.downloading' },
  { state: TrackFileStatus.Failed, labelKey: 'trackState.failed' },
  { state: TrackFileStatus.Unavailable, labelKey: 'trackState.unavailable' }
];

/* Worst wins, because a break is louder news than a wait. */
const SEVERITY: readonly TrackFileStatus[] = [
  TrackFileStatus.Failed,
  TrackFileStatus.Unavailable,
  TrackFileStatus.Downloading,
  TrackFileStatus.Pending
];

interface IncompleteBadgeProps {
  counts: TrackFileStatusCounts | null;
  /* Which edge of the pill the breakdown hangs from. */
  tipEdge?: 'start' | 'end';
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

  if (rows.length === 0) {
    return null;
  }

  const missing = rows.reduce((sum, row) => sum + row.count, 0);
  const tone =
    SEVERITY.find(state => counts[state] > 0) ?? TrackFileStatus.Pending;

  /*
   * A `role="img"`'s children are not read out, so the breakdown rides in the
   * label; the middot is this system's separator between two facts on one line.
   */
  const label = [
    t('library.notDownloaded', { count: missing }),
    ...rows.map(row => `${t(row.labelKey)} ${row.count}`)
  ].join(' · ');

  return (
    <span
      className={styles.incompleteBadge}
      data-tone={tone}
      data-tip={tipEdge}
      role="img"
      aria-label={label}
      tabIndex={0}>
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
            <span className={styles.incompleteBadge__dot} aria-hidden="true" />
            <span className={styles.incompleteBadge__word}>
              {t(row.labelKey)}
            </span>
            <span className={styles.incompleteBadge__value}>{row.count}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
