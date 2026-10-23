import { IconArrowsExchange } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

import { useI18n } from '@playliberty/i18n';

import styles from './EgressLink.module.scss';

/*
 * The operator's door to the exit pool, in the library header. Admin-only at
 * the call site; the server is the gate. The icon carries the egress role
 * colour, the same purple the page uses for its active exit.
 */
export default function EgressLink() {
  const { t } = useI18n();

  return (
    <Link
      to="/egress"
      className={styles.egressLink}
      aria-label={t('egress.title')}
      title={t('egress.title')}>
      <IconArrowsExchange size={18} aria-hidden="true" />
    </Link>
  );
}
