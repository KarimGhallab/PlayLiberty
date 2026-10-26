import { IconChevronLeft } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { EgressStatus } from '@playliberty/contracts';
import { formatRelativeTime, useI18n } from '@playliberty/i18n';
import type { Messages, Translator } from '@playliberty/i18n';

import { ApiError } from '../../../shared/api/client/client';
import {
  useEgress,
  useProbeEgress,
  useSwitchEgress
} from '../../../shared/api/queries/queries';
import NoticeToast from '../../../shared/components/NoticeToast/NoticeToast';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import { NOTICE_WINDOW_MS } from '../../../shared/player/usePlayTransition/usePlayTransition';

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

/* The stored code is the server's classification; an unknown one still gets a
 * sentence rather than the tool's stderr. */
function reasonLabel(t: Translator<Messages>, reason: string): string {
  switch (reason) {
    case 'blocked':
      return t('egress.reason.blocked');
    case 'unavailable':
      return t('egress.reason.unavailable');
    case 'network':
      return t('egress.reason.network');
    default:
      return t('egress.reason.unknown');
  }
}

function timeOf(
  t: Translator<Messages>,
  value: string | null,
  now: number
): string {
  return value === null
    ? t('egress.never')
    : formatRelativeTime(t, new Date(value), now);
}

/*
 * The operator's page: the pool, what the agent says about it, and the last
 * evidence. A non-admin gets the server's not-found, which is the gate.
 */
export default function EgressPage() {
  const { t } = useI18n();
  const egress = useEgress();
  const probe = useProbeEgress();
  const switchExit = useSwitchEgress();
  const [probeNotice, setProbeNotice] = useState<
    'unreachable' | 'failed' | null
  >(null);
  const [switchNotice, setSwitchNotice] = useState<string | null>(null);
  const now = Date.now();
  const notAvailable =
    egress.error instanceof ApiError && egress.error.status === 404;

  useEffect(() => {
    if (probeNotice === null) {
      return;
    }

    const timer = setTimeout(() => setProbeNotice(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [probeNotice]);

  useEffect(() => {
    if (switchNotice === null) {
      return;
    }

    const timer = setTimeout(() => setSwitchNotice(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [switchNotice]);

  const probeMessage =
    probeNotice === 'unreachable'
      ? t('egress.probeUnreachable')
      : t('egress.probeFailed');

  /* The server's fixed sentence is the switch failure's copy; the generic one
   * is only for a failure that carried no detail. */
  const switchTo = (name: string): void => {
    switchExit.mutate(name, {
      onSuccess: read => {
        if (!read.agentReachable) {
          setSwitchNotice(t('egress.probeUnreachable'));
        }
      },
      onError: error => {
        setSwitchNotice(
          error instanceof ApiError
            ? (error.problem?.detail ?? t('egress.switchFailed'))
            : t('egress.switchFailed')
        );
      }
    });
  };

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
                  <th scope="col">{t('egress.lastProbe')}</th>
                  <th scope="col">{t('egress.actions')}</th>
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
                      {config.lastExitIp === null ? null : (
                        <span className={styles.egress__observed}>
                          {t('egress.seen', { ip: config.lastExitIp })}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`${styles.egress__status} ${styles[`egress__status--${config.status}`]}`}>
                        {statusLabel(t, config.status)}
                      </span>
                      {config.status === EgressStatus.Failed &&
                      config.lastError !== null ? (
                        <span className={styles.egress__reason}>
                          {reasonLabel(t, config.lastError)}
                        </span>
                      ) : null}
                    </td>
                    <td className={styles.egress__mono}>
                      {timeOf(t, config.lastAttemptAt, now)}
                    </td>
                    <td className={styles.egress__mono}>
                      {timeOf(t, config.lastProbeAt, now)}
                    </td>
                    <td>
                      <div className={styles.egress__actions}>
                        <div className={styles.egress__probeWrap}>
                          <span
                            className={styles.egress__probeSizer}
                            aria-hidden="true">
                            {t('egress.probing')}
                          </span>
                          <button
                            type="button"
                            className={styles.egress__probe}
                            disabled={probe.isPending}
                            aria-busy={
                              probe.isPending && probe.variables === config.name
                                ? true
                                : undefined
                            }
                            onClick={() =>
                              probe.mutate(config.name, {
                                onSuccess: read => {
                                  if (!read.agentReachable) {
                                    setProbeNotice('unreachable');
                                  }
                                },
                                onError: () => setProbeNotice('failed')
                              })
                            }>
                            {probe.isPending && probe.variables === config.name
                              ? t('egress.probing')
                              : t('egress.probe')}
                          </button>
                        </div>
                        <div className={styles.egress__switchWrap}>
                          <span
                            className={styles.egress__switchSizer}
                            aria-hidden="true">
                            {t('egress.switching')}
                          </span>
                          <button
                            type="button"
                            className={styles.egress__switch}
                            disabled={config.active || switchExit.isPending}
                            aria-busy={
                              switchExit.isPending &&
                              switchExit.variables === config.name
                                ? true
                                : undefined
                            }
                            onClick={() => switchTo(config.name)}>
                            {switchExit.isPending &&
                            switchExit.variables === config.name
                              ? t('egress.switching')
                              : t('egress.switch')}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : null}

      {probeNotice === null ? null : (
        <NoticeToast message={probeMessage} durationMs={NOTICE_WINDOW_MS} />
      )}

      {switchNotice === null ? null : (
        <NoticeToast message={switchNotice} durationMs={NOTICE_WINDOW_MS} />
      )}
    </main>
  );
}
