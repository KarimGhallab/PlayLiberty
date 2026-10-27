import {
  IconArrowsExchange,
  IconChevronLeft,
  IconCircleCheck
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { EgressStatus } from '@playliberty/contracts';
import type { Messages, Translator } from '@playliberty/i18n';
import { formatRelativeTime, useI18n } from '@playliberty/i18n';

import { ApiError } from '../../../shared/api/client/client';
import {
  useCheckEgress,
  useEgress,
  useSwitchEgress
} from '../../../shared/api/queries/queries';
import NotFoundPage from '../../../shared/components/NotFoundPage/NotFoundPage';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import ErrorToast from '../../../shared/components/Toast/ErrorToast';
import SuccessToast from '../../../shared/components/Toast/SuccessToast';
import ToastStack from '../../../shared/components/Toast/ToastStack';
import { NOTICE_WINDOW_MS } from '../../../shared/player/usePlayTransition/usePlayTransition';

import styles from './EgressPage.module.scss';
import { countryNameOf, countryOf, flagOf } from './countryFlag/countryFlag';

interface ActionToast {
  readonly id: number;
  readonly kind: 'success' | 'error';
  readonly message: string;
  readonly detail: string | null;
}

let nextToastId = 0;

function toastId(): number {
  nextToastId += 1;
  return nextToastId;
}

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
    case 'private':
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
  const { t, language } = useI18n();
  const egress = useEgress();
  const switchExit = useSwitchEgress();
  const check = useCheckEgress();
  const [toast, setToast] = useState<ActionToast | null>(null);
  const now = Date.now();
  const notAvailable =
    egress.error instanceof ApiError && egress.error.status === 404;

  useEffect(() => {
    if (toast === null) {
      return;
    }

    const timer = setTimeout(() => setToast(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [toast]);

  if (notAvailable) {
    return <NotFoundPage />;
  }

  const detailOf = (error: Error): string | null =>
    error instanceof ApiError ? (error.problem?.detail ?? null) : null;

  const errorToast = (message: string, detail: string | null): ActionToast => ({
    id: toastId(),
    kind: 'error',
    message,
    detail
  });

  const runSwitch = (name: string): void => {
    switchExit.mutate(name, {
      onSuccess: read => {
        if (!read.agentReachable) {
          setToast(
            errorToast(
              t('egress.toast.switchFailed'),
              t('egress.checkUnreachable')
            )
          );
          return;
        }

        setToast({
          id: toastId(),
          kind: 'success',
          message: t('egress.toast.switched', { name }),
          detail: t('egress.toast.answered')
        });
      },
      onError: error => {
        setToast(errorToast(t('egress.toast.switchFailed'), detailOf(error)));
      }
    });
  };

  const runCheck = (): void => {
    check.mutate(undefined, {
      onSuccess: read => {
        if (!read.agentReachable) {
          setToast(
            errorToast(t('egress.checkFailed'), t('egress.checkUnreachable'))
          );
          return;
        }

        const active = read.configs.find(config => config.active)?.name ?? '';

        setToast({
          id: toastId(),
          kind: 'success',
          message: t('egress.toast.checked', { name: active }),
          detail: t('egress.toast.answered')
        });
      },
      onError: error => {
        setToast(errorToast(t('egress.checkFailed'), detailOf(error)));
      }
    });
  };

  const toastIsSuccess = toast?.kind === 'success';

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

      {egress.isPending ? (
        <p className={styles.egress__say} role="status">
          {t('egress.loading')}
        </p>
      ) : null}

      {egress.isError ? (
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
                  <th scope="col">{t('egress.lastCheck')}</th>
                  <th scope="col">{t('egress.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {egress.data.configs.map(config => {
                  const switchPending =
                    switchExit.isPending &&
                    switchExit.variables === config.name;
                  const pending = config.active
                    ? check.isPending
                    : switchPending;
                  const country = countryOf(config.name);
                  const countryName =
                    country === null ? null : countryNameOf(country, language);
                  const flag = country === null ? null : flagOf(country);

                  return (
                    <tr
                      key={config.name}
                      className={
                        config.active
                          ? styles['egress__row--active']
                          : undefined
                      }>
                      <th scope="row">
                        <div className={styles.egress__name}>
                          {flag === null ? null : (
                            <span
                              className={styles.egress__flag}
                              role="img"
                              aria-label={countryName ?? country ?? undefined}
                              title={countryName ?? country ?? undefined}>
                              {flag}
                            </span>
                          )}
                          {config.name}
                          {config.active ? (
                            <span className={styles.egress__active}>
                              {t('egress.active')}
                            </span>
                          ) : null}
                        </div>
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
                        {timeOf(t, config.lastCheckAt, now)}
                      </td>
                      <td>
                        <div className={styles.egress__actionWrap}>
                          <span
                            className={styles.egress__actionSizer}
                            aria-hidden="true">
                            {config.active ? (
                              <IconCircleCheck
                                className={styles.egress__actionIcon}
                                focusable="false"
                              />
                            ) : (
                              <IconArrowsExchange
                                className={`${styles.egress__actionIcon} ${styles.egress__switchIcon}`}
                                focusable="false"
                              />
                            )}
                            {config.active
                              ? t('egress.checking')
                              : t('egress.switching')}
                          </span>
                          <button
                            type="button"
                            className={styles.egress__action}
                            disabled={switchExit.isPending || check.isPending}
                            aria-busy={pending ? true : undefined}
                            onClick={() =>
                              config.active
                                ? runCheck()
                                : runSwitch(config.name)
                            }>
                            {config.active ? (
                              <IconCircleCheck
                                className={styles.egress__actionIcon}
                                aria-hidden="true"
                                focusable="false"
                              />
                            ) : (
                              <IconArrowsExchange
                                className={`${styles.egress__actionIcon} ${styles.egress__switchIcon}`}
                                aria-hidden="true"
                                focusable="false"
                              />
                            )}
                            {pending
                              ? config.active
                                ? t('egress.checking')
                                : t('egress.switching')
                              : config.active
                                ? t('egress.check')
                                : t('egress.switch')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      ) : null}

      {toast === null ? null : (
        <ToastStack>
          {toastIsSuccess ? (
            <SuccessToast
              key={toast.id}
              message={toast.message}
              detail={toast.detail}
              durationMs={NOTICE_WINDOW_MS}
              onDismiss={() => setToast(null)}
            />
          ) : (
            <ErrorToast
              key={toast.id}
              message={toast.message}
              detail={toast.detail}
              durationMs={NOTICE_WINDOW_MS}
              onDismiss={() => setToast(null)}
            />
          )}
        </ToastStack>
      )}
    </main>
  );
}
