import { IconRotate } from '@tabler/icons-react';

import { useI18n } from '@playliberty/i18n';

import Spinner from '../Spinner/Spinner';
import styles from './SyncAllControl.module.scss';

/*
 * The gallery's one bulk action: the count is both the label and the set the
 * press starts, so the label cannot drift from the set. A pointer collapses it
 * to its icon, where the count lives in the accessible name.
 */

interface SyncAllControlProps {
  readonly count: number;
  readonly working: boolean;
  readonly onPress: () => void;
}

export default function SyncAllControl({
  count,
  working,
  onPress
}: SyncAllControlProps) {
  const { t } = useI18n();
  const label = working
    ? t('library.syncingAll', { count })
    : t('library.syncAll', { count });

  return (
    <button
      type="button"
      className={styles.syncAll}
      aria-label={label}
      aria-busy={working ? true : undefined}
      disabled={working}
      onClick={onPress}>
      {/* The name is the label, so the copy the pill clips is decoration. */}
      <span className={styles.syncAll__word} aria-hidden="true">
        {label}
      </span>
      <span className={styles.syncAll__glyph}>
        {working ? (
          <Spinner />
        ) : (
          <IconRotate
            className={styles.syncAll__icon}
            aria-hidden="true"
            focusable="false"
          />
        )}
      </span>
    </button>
  );
}
