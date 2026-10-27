import { IconArrowLeft } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

import { useI18n } from '@playliberty/i18n';

import styles from './NotFoundPage.module.scss';

/*
 * The page-level 404. The playlist's not-found stays its own list-area state;
 * this one stands in for the whole page, whether the URL is unknown or the
 * egress route is not available to the account.
 */
export default function NotFoundPage() {
  const { t } = useI18n();

  return (
    <main className={styles.notFoundPage}>
      <p className={styles.notFoundPage__code} aria-hidden="true">
        {t('notFoundPage.code')}
      </p>
      <div className={styles.notFoundPage__text}>
        <h1 className={styles.notFoundPage__head}>
          {t('notFoundPage.heading')}
        </h1>
        <p className={styles.notFoundPage__prose}>{t('notFoundPage.prose')}</p>
      </div>
      <Link to="/" className={styles.notFoundPage__action}>
        <IconArrowLeft
          className={styles.notFoundPage__actionIcon}
          aria-hidden="true"
          focusable="false"
        />
        {t('notFoundPage.back')}
      </Link>
    </main>
  );
}
