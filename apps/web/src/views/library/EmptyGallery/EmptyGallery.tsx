import { IconPlus } from '@tabler/icons-react';

import { useI18n } from '@playliberty/i18n';

import styles from './EmptyGallery.module.scss';

/*
 * The library with no playlists at all. A different component from the playlist
 * empty state, and the difference is one word: that one's action is `Sync now`,
 * because a playlist that exists and has no tracks has never been synced; this
 * one's action is `Add a playlist`, because there is nothing to sync.
 *
 * The stack is centred and top-aligned in the list it replaces, not vertically
 * centred in the page, because a list starts at the top.
 */

interface EmptyGalleryProps {
  onAdd: () => void;
}

export default function EmptyGallery({ onAdd }: EmptyGalleryProps) {
  const { t } = useI18n();

  return (
    <div className={styles.emptyGallery}>
      <p className={styles.emptyGallery__head}>{t('library.empty.heading')}</p>
      <p className={styles.emptyGallery__promise}>
        {t('library.empty.promise')}
      </p>
      <button
        type="button"
        className={styles.emptyGallery__action}
        onClick={onAdd}>
        <IconPlus
          className={styles.emptyGallery__actionIcon}
          aria-hidden="true"
          focusable="false"
        />
        {t('library.add')}
      </button>
    </div>
  );
}
