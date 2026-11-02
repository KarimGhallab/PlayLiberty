import {
  IconArrowsExchange,
  IconCircleCheck
} from '@tabler/icons-react-native';
import { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EgressStatus } from '@playliberty/contracts';
import type { EgressConfig } from '@playliberty/contracts';
import type { Language, Messages, Translator } from '@playliberty/i18n';
import { formatRelativeTime, useI18n } from '@playliberty/i18n';
import { countryNameOf, countryOf, flagOf } from '@playliberty/ui-foundation';

import Notice from '../../../shared/components/Notice/Notice';
import PressableScale from '../../../shared/components/PressableScale/PressableScale';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import Screen from '../../../shared/components/Screen/Screen';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../../shared/styles/tokens';

import { ApiError } from '../../../api/apiClient/ApiClient';
import {
  useCheckEgress,
  useEgress,
  useSwitchEgress
} from '../../../api/useEgress';
import { playerBarHeight } from '../../../player/playerBarSize/playerBarSize';
import { usePlayerStore } from '../../../player/playerStore/playerStore';

interface ActionNotice {
  readonly message: string;
  readonly detail: string | null;
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

/* The state's word carries its tone; the card never relies on colour alone. */
function statusTone(status: EgressStatus): string {
  switch (status) {
    case EgressStatus.Ok:
      return tokenColor('ink');
    case EgressStatus.Failed:
      return tokenColor('tone-failed');
    case EgressStatus.Unknown:
      return tokenColor('muted');
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

interface ConfigCardProps {
  readonly config: EgressConfig;
  readonly t: Translator<Messages>;
  readonly language: Language;
  readonly now: number;
  readonly disabled: boolean;
  readonly pending: boolean;
  readonly onPress: () => void;
}

/* One exit stacked: its name, its facts, then the one action the row allows. */
function ConfigCard({
  config,
  t,
  language,
  now,
  disabled,
  pending,
  onPress
}: ConfigCardProps) {
  const country = countryOf(config.name);
  const countryName =
    country === null ? null : countryNameOf(country, language);
  /* Hermes has no `Intl.DisplayNames`; the code is the word the web falls back
   * to as well. */
  const countryWord = countryName ?? country;
  const flag = country === null ? null : flagOf(country);
  const observed =
    config.lastExitIp === null
      ? null
      : t('egress.seen', { ip: config.lastExitIp });
  const reason =
    config.status === EgressStatus.Failed && config.lastError !== null
      ? reasonLabel(t, config.lastError)
      : null;
  const idle = config.active ? t('egress.check') : t('egress.switch');
  const working = config.active ? t('egress.checking') : t('egress.switching');
  const ActionIcon = config.active ? IconCircleCheck : IconArrowsExchange;
  const iconColor = disabled
    ? tokenColor('control-disabled-fg')
    : config.active
      ? tokenColor('ink')
      : tokenColor('egress');

  return (
    <View
      testID={`egress-card-${config.name}`}
      style={[styles.card, config.active && styles.cardActive]}>
      <View style={styles.identity}>
        {flag === null ? null : (
          <Text
            accessible
            accessibilityRole="image"
            accessibilityLabel={countryWord ?? undefined}
            style={styles.flag}>
            {flag}
          </Text>
        )}
        <Text numberOfLines={2} style={styles.name}>
          {config.name}
        </Text>
        {config.active ? (
          <Text testID={`egress-active-${config.name}`} style={styles.active}>
            {t('egress.active')}
          </Text>
        ) : null}
      </View>
      <View style={styles.facts}>
        <View style={styles.fact}>
          <Text style={styles.label}>{t('egress.endpoint')}</Text>
          <Text style={styles.value}>{config.endpoint ?? '-'}</Text>
          {observed === null ? null : (
            <Text style={styles.sub}>{observed}</Text>
          )}
        </View>
        <View style={styles.factRow}>
          <View style={styles.factHalf}>
            <Text style={styles.label}>{t('egress.status')}</Text>
            <Text style={[styles.value, { color: statusTone(config.status) }]}>
              {statusLabel(t, config.status)}
            </Text>
            {reason === null ? null : <Text style={styles.sub}>{reason}</Text>}
          </View>
          <View style={styles.factHalf}>
            <Text style={styles.label}>{t('egress.lastAttempt')}</Text>
            <Text style={styles.value}>
              {timeOf(t, config.lastAttemptAt, now)}
            </Text>
          </View>
        </View>
        <View style={styles.factRow}>
          <View style={styles.factHalf}>
            <Text style={styles.label}>{t('egress.lastCheck')}</Text>
            <Text style={styles.value}>
              {timeOf(t, config.lastCheckAt, now)}
            </Text>
          </View>
        </View>
      </View>
      <PressableScale
        testID={`egress-action-${config.name}`}
        accessibilityRole="button"
        accessibilityLabel={`${idle} ${config.name}`}
        accessibilityState={{ disabled, busy: pending }}
        disabled={disabled}
        style={[styles.action, disabled && styles.actionDisabled]}
        onPress={onPress}>
        <ActionIcon size={tokenLength('icon-sm')} color={iconColor} />
        <Text
          style={[styles.actionLabel, disabled && styles.actionLabelDisabled]}>
          {pending ? working : idle}
        </Text>
      </PressableScale>
    </View>
  );
}

/*
 * The operator's pool: the agent's reachability, one card per exit, and the
 * one action each card allows. One action runs at a time.
 */
export default function EgressScreen() {
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const egress = useEgress();
  const switchExit = useSwitchEgress();
  const check = useCheckEgress();
  const [notice, setNotice] = useState<ActionNotice | null>(null);
  const playerOffset =
    usePlayerStore(state => state.currentId) === null ? 0 : playerBarHeight;
  const now = Date.now();
  const busy = switchExit.isPending || check.isPending;

  const detailOf = (error: Error): string | null =>
    error instanceof ApiError ? (error.problem?.detail ?? null) : null;

  const runSwitch = (name: string): void => {
    switchExit.mutate(name, {
      onSuccess: read => {
        if (!read.agentReachable) {
          setNotice({
            message: t('egress.toast.switchFailed'),
            detail: t('egress.checkUnreachable')
          });
          return;
        }

        setNotice({
          message: t('egress.toast.switched', { name }),
          detail: t('egress.toast.answered')
        });
      },
      onError: error => {
        setNotice({
          message: t('egress.toast.switchFailed'),
          detail: detailOf(error)
        });
      }
    });
  };

  const runCheck = (): void => {
    check.mutate(undefined, {
      onSuccess: read => {
        if (!read.agentReachable) {
          setNotice({
            message: t('egress.checkFailed'),
            detail: t('egress.checkUnreachable')
          });
          return;
        }

        const active = read.configs.find(config => config.active)?.name ?? '';

        setNotice({
          message: t('egress.toast.checked', { name: active }),
          detail: t('egress.toast.answered')
        });
      },
      onError: error => {
        setNotice({
          message: t('egress.checkFailed'),
          detail: detailOf(error)
        });
      }
    });
  };

  if (egress.isPending) {
    return (
      <Screen testID="egress-screen" title={t('egress.title')}>
        <Text accessibilityLiveRegion="polite" style={styles.say}>
          {t('egress.loading')}
        </Text>
      </Screen>
    );
  }

  if (egress.isError) {
    return (
      <Screen testID="egress-screen" title={t('egress.title')}>
        <ReadFailure
          message={t('egress.readFailed')}
          retrying={egress.isFetching}
          onRetry={() => {
            void egress.refetch();
          }}
        />
      </Screen>
    );
  }

  if (egress.data === undefined) {
    return null;
  }

  return (
    <>
      <Screen testID="egress-screen" title={t('egress.title')}>
        <View style={styles.agentRow}>
          <View
            style={[
              styles.agentDot,
              {
                backgroundColor: egress.data.agentReachable
                  ? tokenColor('egress')
                  : tokenColor('tone-failed')
              }
            ]}
          />
          <Text
            testID="egress-agent"
            accessibilityLiveRegion="polite"
            style={[
              styles.agent,
              {
                color: egress.data.agentReachable
                  ? tokenColor('muted')
                  : tokenColor('ink')
              }
            ]}>
            {egress.data.agentReachable
              ? t('egress.agentUp')
              : t('egress.agentDown')}
          </Text>
        </View>
        <ScrollView
          testID="egress-scroll"
          style={styles.scroll}
          refreshControl={
            <RefreshControl
              testID="egress-refresh"
              refreshing={egress.isRefetching}
              onRefresh={() => {
                void egress.refetch();
              }}
              tintColor={tokenColor('ink')}
              colors={[tokenColor('accent')]}
            />
          }
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                insets.bottom + tokenLength('space-4') + playerOffset
            }
          ]}>
          {egress.data.configs.length === 0 ? (
            <Text style={styles.say}>{t('egress.empty')}</Text>
          ) : (
            egress.data.configs.map(config => {
              const pending = config.active
                ? check.isPending
                : switchExit.isPending && switchExit.variables === config.name;

              return (
                <ConfigCard
                  key={config.name}
                  config={config}
                  t={t}
                  language={language}
                  now={now}
                  disabled={busy}
                  pending={pending}
                  onPress={() => {
                    if (config.active) {
                      runCheck();
                      return;
                    }

                    runSwitch(config.name);
                  }}
                />
              );
            })
          )}
        </ScrollView>
      </Screen>
      {notice === null ? null : (
        <Notice
          message={notice.message}
          detail={notice.detail}
          onDismiss={() => setNotice(null)}
          bottomOffset={playerOffset}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  },
  agentDot: {
    width: 7,
    height: 7,
    borderRadius: tokenLength('radius-chip')
  },
  agent: {
    flexShrink: 1,
    fontFamily,
    fontSize: tokenLength('text-sm'),
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  },
  scroll: {
    flex: 1
  },
  content: {
    gap: tokenLength('space-3')
  },
  card: {
    gap: tokenLength('space-3'),
    padding: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('line'),
    borderRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface')
  },
  cardActive: {
    borderColor: tokenColor('egress-border'),
    backgroundColor: tokenColor('egress-surface')
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  },
  flag: {
    fontSize: tokenLength('text-lg'),
    lineHeight: tokenLength('text-md') * tokenNumber('leading-tight')
  },
  name: {
    flexShrink: 1,
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: '600'
  },
  active: {
    paddingVertical: 1,
    paddingHorizontal: tokenLength('space-2'),
    color: tokenColor('egress'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    fontWeight: '500',
    backgroundColor: tokenColor('egress-surface'),
    borderWidth: 1,
    borderColor: tokenColor('egress-border'),
    borderRadius: tokenLength('radius-chip')
  },
  facts: {
    gap: tokenLength('space-3')
  },
  factRow: {
    flexDirection: 'row',
    gap: tokenLength('space-4')
  },
  fact: {
    gap: tokenLength('space-1')
  },
  factHalf: {
    flex: 1,
    minWidth: 0,
    gap: tokenLength('space-1')
  },
  label: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    lineHeight: tokenLength('text-xs') * tokenNumber('leading-normal')
  },
  value: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontVariant: ['tabular-nums'],
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  },
  sub: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    lineHeight: tokenLength('text-xs') * tokenNumber('leading-normal')
  },
  action: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('surface-raised')
  },
  actionDisabled: {
    borderColor: tokenColor('line'),
    backgroundColor: tokenColor('control-disabled-bg')
  },
  actionLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '600'
  },
  actionLabelDisabled: {
    color: tokenColor('control-disabled-fg')
  },
  say: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  }
});
