import { IconArrowLeft } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

import { useI18n } from '@playliberty/i18n';

import styles from './PlaylistNotFound.module.scss';

/*
 * The not-found state: the list area's own state when the playlist query
 * answers 404. The design record (`docs/design-system/screens/playlist-detail.md`)
 * names it as a component this screen needs, and says why the empty state cannot
 * stand in for it: the empty state's words say nothing is here because the
 * playlist has never synced, which is a lie for a playlist that was shared and
 * is not any more.
 *
 * A playlist that does not exist and one the account cannot see both answer 404
 * at one status, so the copy speaks about both without claiming to know which
 * happened: "may have been deleted, or it may be shared with someone else". It
 * is not an error and it does not apologise; it explains an ordinary household
 * event and gives one way out, back to the library.
 *
 * The heading is an `h1` because on this route it is the page's own heading: the
 * main screen carries none, so a reader who lands here can still navigate by
 * heading and hear what the screen is about.
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
