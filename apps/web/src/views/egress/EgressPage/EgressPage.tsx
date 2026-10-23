import { IconChevronLeft } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

import type { EgressConfig } from '@playliberty/contracts';
import { EgressStatus } from '@playliberty/contracts';
import { formatRelativeTime, useI18n } from '@playliberty/i18n';
import type { Messages, Translator } from '@playliberty/i18n';

import { ApiError } from '../../../shared/api/client/client';
import { useEgress } from '../../../shared/api/queries/queries';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';

import styles from './EgressPage.module.scss';

function statusLabel(t: Translator<Messages>, status: EgressStatus): string {
  switch (status) {
    case EgressStatus.Ok:
      return t('egress.statusOk');
    case EgressStatus.Failed:
      return t('egress.statusFailed');
    case EgressStatus.Unknown:
      return t('egress.statusUnknown');
  }
}

function attemptOf(
  t: Translator<Messages>,
  config: EgressConfig,
  now: number
): string {
  return config.lastAttemptAt === null
    ? t('egress.never')
    : formatRelativeTime(t, new Date(config.lastAttemptAt), now);
}

/*
 * The operator's page: the pool, what the agent says about it, and the last
 * evidence. A non-admin gets the server's not-found, which is the gate.
 */
export default function EgressPage() {
  const { t } = useI18n();
  const egress = useEgress();
  const now = Date.now();
  const notAvailable =
    egress.error instanceof ApiError && egress.error.status === 404;

  return (
    <main className={styles.egress}>
      <nav className={styles.egress__wayhome}>
        <Link to="/" className={styles.egress__back}>
          <IconChevronLeft
            className={styles['egress__back-icon']}
            aria-hidden="true"
            focusable="false"
          />
          {t('egress.back')}
        </Link>
      </nav>

      <div className={styles.egress__head}>
        <h1 className={styles.egress__title}>{t('egress.title')}</h1>
      </div>

      {notAvailable ? (
        <p className={styles.egress__say}>{t('egress.notAvailable')}</p>
      ) : null}

      {egress.isPending ? (
        <p className={styles.egress__say} role="status">
          {t('egress.loading')}
        </p>
      ) : null}

      {egress.isError && !notAvailable ? (
        <ReadFailure
          message={t('egress.readFailed')}
          error={egress.error}
          onRetry={() => void egress.refetch()}
          retrying={egress.isFetching}
        />
      ) : null}

      {egress.isSuccess ? (
        <>
          <p
            className={
              egress.data.agentReachable
                ? styles['egress__agent']
                : `${styles['egress__agent']} ${styles['egress__agent--down']}`
            }
            role="status">
            {egress.data.agentReachable
              ? t('egress.agentUp')
              : t('egress.agentDown')}
          </p>

          {egress.data.configs.length === 0 ? (
            <p className={styles.egress__say}>{t('egress.empty')}</p>
          ) : (
            <table
              className={styles.egress__table}
              aria-label={t('egress.title')}>
              <thead>
                <tr>
                  <th scope="col">{t('egress.name')}</th>
                  <th scope="col">{t('egress.endpoint')}</th>
                  <th scope="col">{t('egress.status')}</th>
                  <th scope="col">{t('egress.lastAttempt')}</th>
                </tr>
              </thead>
              <tbody>
                {egress.data.configs.map(config => (
                  <tr
                    key={config.name}
                    className={
                      config.active ? styles['egress__row--active'] : undefined
                    }>
                    <th scope="row" className={styles.egress__name}>
                      {config.name}
                      {config.active ? (
                        <span className={styles.egress__active}>
                          {t('egress.active')}
                        </span>
                      ) : null}
                    </th>
                    <td className={styles.egress__mono}>
                      {config.endpoint ?? '-'}
                    </td>
                    <td>
                      <span
                        className={`${styles.egress__status} ${styles[`egress__status--${config.status}`]}`}>
                        {statusLabel(t, config.status)}
                      </span>
                    </td>
                    <td className={styles.egress__mono}>
                      {attemptOf(t, config, now)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : null}
    </main>
  );
}
