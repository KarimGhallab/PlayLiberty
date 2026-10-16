import { IconArrowLeft } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

import { useI18n } from '@playliberty/i18n';

import styles from './PlaylistNotFound.module.scss';

/*
 * The not-found state: the list area's own state when the playlist query answers
 * 404. A playlist that does not exist and one the account cannot see share one
 * status, so the copy names neither. The heading is the page's own `h1`.
 */
export default function PlaylistNotFound() {
  const { t } = useI18n();

  return (
    <div className={styles.playlistNotFound}>
      <div className={styles.playlistNotFound__text}>
        <h1 className={styles.playlistNotFound__head}>
          {t('notFound.heading')}
        </h1>
        <p className={styles.playlistNotFound__prose}>{t('notFound.prose')}</p>
      </div>
      <Link to="/" className={styles.playlistNotFound__action}>
        <IconArrowLeft
          className={styles.playlistNotFound__actionIcon}
          aria-hidden="true"
          focusable="false"
        />
        {t('notFound.back')}
      </Link>
    </div>
  );
}
