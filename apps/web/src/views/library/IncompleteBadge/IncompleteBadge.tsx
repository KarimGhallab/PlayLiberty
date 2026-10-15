import { IconDownload } from '@tabler/icons-react';

import { TrackFileStatus } from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';
import type { MessageKey, Messages } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import styles from './IncompleteBadge.module.scss';

/*
 * The mark a playlist wears while part of it is not on disk: one pill carrying the
 * count, and on hover or focus the count broken down by state. A gallery of covers
 * cannot say "one of these is still coming" any other way, and the sync state says
 * it wrongly: a run that finished hours ago leaves a playlist reading "Up to date"
 * with four failed tracks.
 *
 * One pill per playlist however many reasons are missing, toned by the worst
 * reason present, because two pills on one card would read as two facts about two
 * things. The count is every association whose file is not stored, which is the
 * sum of the four other states: `stored` is the one state that means the file is
 * here, so its complement is the answer.
 *
 * A track whose source video is gone is not a reason here. The counts the server
 * sends group by file status alone, so a stored file whose video was removed is
 * stored, and this mark is about files.
 *
 * The mark carries no read of its own: its counts come from the library's list, so
 * a gallery of forty playlists asks once. `counts` is null where the caller's read
 * does not carry them, and then the mark draws nothing rather than a zero it
 * cannot stand behind.
 *
 * The breakdown hangs from the edge of the pill the row anchors it to, which is the
 * caller's to say because the caller is what put the mark there: the tile leads its
 * actions row with it, and the card ends its name row with it. A panel that hung
 * the same way from both would leave the frame on one of them.
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
   * The breakdown rides in the label rather than only in the tip: the mark is a
   * `role="img"`, whose children are not read out, so a tip alone would be a
   * detail only a pointer could reach. The middot is this system's own separator
   * between two facts on one line.
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
