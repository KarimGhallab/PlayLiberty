import { IconRotateClockwise } from '@tabler/icons-react';
import { useState } from 'react';

import type { Provider } from '@playliberty/contracts';
import { providerLabel, useI18n } from '@playliberty/i18n';

import styles from './SyncError.module.scss';

/*
 * The sync error replaces the summary rather than joining it. The server's
 * diagnostic is an unbounded string, so it sits behind a reveal control; the
 * sentence is a mapped phrase and never the server's own words.
 */

interface SyncErrorProps {
  /* How many tracks are still here, for the reassurance; null when the count is
   * not known, in which case the reassurance is absent. */
  trackCount: number | null;
  provider: Provider;
  /* The server's own diagnostic, behind the reveal control. Null when there is
   * nothing to reveal, which is the no-run case. */
  rawError: string | null;
  /* The retry. The page owns the mutation so this stays a presentation
   * component, and the button is drawn only when there is something to do. */
  onRetry?: () => void;
  retrying?: boolean;
}

export default function SyncError({
  trackCount,
  provider,
  rawError,
  onRetry,
  retrying = false
}: SyncErrorProps) {
  const { t } = useI18n();
  const providerName = providerLabel(t, provider);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={styles.syncError}>
      <div className={styles.syncError__band}>
        <p className={styles.syncError__say}>
          {t('syncError.reach', { provider: providerName })}
        </p>
        {trackCount === null || trackCount === 0 ? null : (
          <p className={styles.syncError__safe}>
            {t('syncError.safe', { count: trackCount, provider: providerName })}
          </p>
        )}
        {onRetry === undefined ? null : (
          <div>
            <button
              type="button"
              className={styles.syncError__retry}
              data-loading={retrying ? 'true' : undefined}
              aria-busy={retrying ? true : undefined}
              onClick={onRetry}
              disabled={retrying}>
              {retrying ? (
                <span
                  className={styles.syncError__spinner}
                  aria-hidden="true"
                />
              ) : (
                <IconRotateClockwise
                  className={styles.syncError__retryIcon}
                  aria-hidden="true"
                  focusable="false"
                />
              )}
              {retrying ? t('syncError.syncing') : t('syncError.sync')}
            </button>
          </div>
        )}
        {rawError === null ? null : (
          <>
            <button
              type="button"
              className={styles.syncError__reveal}
              aria-expanded={revealed}
              onClick={() => setRevealed(current => !current)}>
              {revealed ? t('syncError.hide') : t('syncError.show')}
            </button>
            {revealed ? (
              <pre className={styles.syncError__raw}>{rawError}</pre>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
