import { useId } from 'react';

import styles from './PlaylistSkipSetting.module.scss';

/*
 * The playlist's skip-non-music setting, as a switch. The owner and a write
 * collaborator may change it; a read collaborator sees the same control disabled,
 * because the value is still theirs to read. The change is not retroactive: it is
 * the default for tracks created from now on, and every track already created
 * keeps the value it was born with.
 *
 * The page owns the mutation and the optimistic update, so this is presentational:
 * `skipNonMusic` is what the server last answered (or the optimistic guess while a
 * request is in flight), `saving` locks the switch until the answer lands, and
 * `onChange` fires the request. A switch rather than a checkbox because the write
 * is immediate and there is no form to submit.
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
  const labelId = useId();

  return (
    <div className={styles.setting}>
      <span className={styles.setting__label} id={labelId}>
        Skip non-music parts
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
