import { useId } from 'react';

import { useI18n } from '@playliberty/i18n';

import styles from './PlaylistSkipSetting.module.scss';

/*
 * The playlist's skip-non-music setting, as a switch. The owner and a write
 * collaborator may change it; a reader sees the same control disabled. The
 * change is not retroactive: it is the default for tracks created from now on.
 */

interface PlaylistSkipSettingProps {
  skipNonMusic: boolean;
  canEdit: boolean;
  saving?: boolean;
  onChange: (skipNonMusic: boolean) => void;
}

export default function PlaylistSkipSetting({
  skipNonMusic,
  canEdit,
  saving = false,
  onChange
}: PlaylistSkipSettingProps) {
  const { t } = useI18n();
  const labelId = useId();

  return (
    <div className={styles.setting}>
      <span className={styles.setting__label} id={labelId}>
        {t('skipSetting.label')}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={skipNonMusic}
        aria-labelledby={labelId}
        className={styles.setting__switch}
        data-on={skipNonMusic ? 'true' : undefined}
        disabled={!canEdit || saving}
        onClick={() => onChange(!skipNonMusic)}>
        <span className={styles.setting__thumb} aria-hidden="true" />
      </button>
    </div>
  );
}
