import {
  IconArrowsSort,
  IconCheck,
  IconChevronDown
} from '@tabler/icons-react';
import { useState } from 'react';

import { PlaylistSort } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import styles from './PlaylistSortControl.module.scss';

/*
 * The order the playlist's tracks are read in, as a menu button at the end of
 * the control row. The owner and a write collaborator may change it; it is
 * disabled while the queue is this playlist and shuffled, whose order differs.
 */

interface PlaylistSortControlProps {
  sort: PlaylistSort;
  canEdit: boolean;
  shuffled: boolean;
  saving?: boolean;
  onChange: (sort: PlaylistSort) => void;
}

const OPTIONS = [
  { sort: PlaylistSort.Playlist, key: 'detail.sortPlaylist' },
  { sort: PlaylistSort.NewestFirst, key: 'detail.sortNewest' },
  { sort: PlaylistSort.OldestFirst, key: 'detail.sortOldest' }
] as const;

export default function PlaylistSortControl({
  sort,
  canEdit,
  shuffled,
  saving = false,
  onChange
}: PlaylistSortControlProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const disabled = !canEdit || saving || shuffled;
  const current = OPTIONS.find(option => option.sort === sort) ?? OPTIONS[0];
  const label = t(current.key);

  return (
    <div className={styles.sort}>
      <button
        type="button"
        className={styles.sort__button}
        aria-haspopup="listbox"
        aria-expanded={open && !disabled}
        aria-label={`${t('detail.sortBy')}: ${label}`}
        data-open={(open && !disabled) || undefined}
        disabled={disabled}
        onClick={() => setOpen(wasOpen => !wasOpen)}>
        <IconArrowsSort
          className={styles.sort__glyph}
          aria-hidden="true"
          focusable="false"
        />
        <span className={styles.sort__value}>{label}</span>
        <IconChevronDown
          className={styles.sort__chevron}
          aria-hidden="true"
          focusable="false"
        />
      </button>
      {open && !disabled ? (
        <ul
          className={styles.sort__menu}
          role="listbox"
          aria-label={t('detail.sortBy')}>
          {OPTIONS.map(option => (
            <li key={option.sort} className={styles.sort__entry}>
              <button
                type="button"
                role="option"
                aria-selected={sort === option.sort}
                className={styles.sort__item}
                onClick={() => {
                  setOpen(false);

                  if (option.sort !== sort) {
                    onChange(option.sort);
                  }
                }}>
                <span className={styles.sort__check}>
                  <IconCheck aria-hidden="true" focusable="false" />
                </span>
                {t(option.key)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
