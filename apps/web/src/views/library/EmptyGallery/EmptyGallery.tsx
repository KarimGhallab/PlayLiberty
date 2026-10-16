import { IconPlus } from '@tabler/icons-react';

import { useI18n } from '@playliberty/i18n';

import styles from './EmptyGallery.module.scss';

/*
 * A different component from the playlist empty state: that one syncs a
 * playlist that exists, this one has nothing to sync.
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
