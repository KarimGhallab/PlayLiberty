import {
  IconArrowsSort,
  IconCheck,
  IconChevronDown
} from '@tabler/icons-react';
import { useRef, useState } from 'react';

import { PlaylistSort } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import { useDismissibleMenu } from '../useDismissibleMenu/useDismissibleMenu';
import styles from './PlaylistSortControl.module.scss';

/*
 * The order the playlist's tracks are read in, as a menu button above the
 * filter chips. The owner and a write collaborator may change it; it is
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
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const disabled = !canEdit || saving || shuffled;
  const shown = open && !disabled;
  const current = OPTIONS.find(option => option.sort === sort) ?? OPTIONS[0];
  const label = t(current.key);

  /* A chosen order closes the menu and puts the keyboard back on the button;
   * the hook owns the open state, so this is the only close that moves focus. */
  const choose = (chosen: PlaylistSort): void => {
    setOpen(false);
    buttonRef.current?.focus();

    if (chosen !== sort) {
      onChange(chosen);
    }
  };

  useDismissibleMenu({
    open: shown,
    containerRef: rootRef,
    triggerRef: buttonRef,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false)
  });

  return (
    <div className={styles.sort} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.sort__button}
        aria-haspopup="listbox"
        aria-expanded={shown}
        aria-label={`${t('detail.sortBy')}: ${label}`}
        data-open={shown || undefined}
        disabled={disabled}
        onClick={() => setOpen(wasOpen => !wasOpen)}>
        <IconArrowsSort
          className={styles.sort__glyph}
          aria-hidden="true"
          focusable="false"
        />
        <span className={styles.sort__prefix}>{t('detail.sortBy')}</span>
        <span className={styles.sort__value}>{label}</span>
        <IconChevronDown
          className={styles.sort__chevron}
          aria-hidden="true"
          focusable="false"
        />
      </button>
      {shown ? (
        <ul
          className={styles.sort__menu}
          role="listbox"
          aria-label={t('detail.sortBy')}>
          {OPTIONS.map(option => (
            <li key={option.sort} className={styles.sort__entry}>
              <button
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={sort === option.sort}
                className={styles.sort__item}
                onClick={() => choose(option.sort)}>
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
