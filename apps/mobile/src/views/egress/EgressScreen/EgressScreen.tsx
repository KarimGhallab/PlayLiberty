import { useState } from 'react';
import {
  Pressable,
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

interface ConfigCardProps {
  readonly config: EgressConfig;
  readonly t: Translator<Messages>;
  readonly language: Language;
  readonly now: number;
  readonly disabled: boolean;
  readonly pending: boolean;
  readonly onPress: () => void;
}

/* One exit stacked: its name and country, its facts, then the one action the
 * row allows. */
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
  const lastAttempt =
    config.lastAttemptAt === null
      ? t('egress.never')
      : formatRelativeTime(t, new Date(config.lastAttemptAt), now);
  const idle = config.active ? t('egress.check') : t('egress.switch');
  const working = config.active ? t('egress.checking') : t('egress.switching');

  return (
    <View
      testID={`egress-card-${config.name}`}
      style={[styles.card, config.active && styles.cardActive]}>
      <View style={styles.identity}>
        {flag === null ? null : (
          <Text accessible={false} style={styles.flag}>
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
      {countryWord === null ? null : (
        <Text style={styles.country}>{countryWord}</Text>
      )}
      <View style={styles.facts}>
        <View style={styles.fact}>
          <Text style={styles.label}>{t('egress.endpoint')}</Text>
          <Text style={styles.value}>{config.endpoint ?? '-'}</Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.label}>{t('egress.status')}</Text>
          <Text style={[styles.value, { color: statusTone(config.status) }]}>
            {statusLabel(t, config.status)}
          </Text>
        </View>
        <View style={styles.fact}>
          <Text style={styles.label}>{t('egress.lastAttempt')}</Text>
          <Text style={styles.value}>{lastAttempt}</Text>
        </View>
      </View>
      <Pressable
        testID={`egress-action-${config.name}`}
        accessibilityRole="button"
        accessibilityLabel={`${idle} ${config.name}`}
        accessibilityState={{ disabled, busy: pending }}
        disabled={disabled}
        style={({ pressed }) => [
          styles.action,
          pressed && styles.actionPressed,
          disabled && styles.actionDisabled
        ]}
        onPress={onPress}>
        <Text style={styles.actionLabel}>{pending ? working : idle}</Text>
      </Pressable>
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
        <Text style={styles.say}>{t('egress.loading')}</Text>
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
        <Text
          testID="egress-agent"
          style={[
            styles.agent,
            {
              color: egress.data.agentReachable
                ? tokenColor('accent')
                : tokenColor('tone-failed')
            }
          ]}>
          {egress.data.agentReachable
            ? t('egress.agentUp')
            : t('egress.agentDown')}
        </Text>
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
  agent: {
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '600',
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  },
  scroll: {
    flex: 1
  },
  content: {
    gap: tokenLength('space-3')
  },
  card: {
    gap: tokenLength('space-2'),
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
    fontSize: tokenLength('text-lg')
  },
  name: {
    flexShrink: 1,
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: '600'
  },
  active: {
    color: tokenColor('egress'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    fontWeight: '600'
  },
  country: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  facts: {
    gap: tokenLength('space-2')
  },
  fact: {
    gap: tokenLength('space-1')
  },
  label: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  value: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  },
  action: {
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('surface-raised')
  },
  actionPressed: {
    backgroundColor: tokenColor('surface')
  },
  actionDisabled: {
    opacity: tokenNumber('opacity-disabled')
  },
  actionLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '600'
  },
  say: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  }
});
