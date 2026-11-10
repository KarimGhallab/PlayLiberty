import {
  IconArrowsExchange,
  IconCircleCheck
} from '@tabler/icons-react-native';
import { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ApiError,
  useCheckEgress,
  useEgress,
  useSwitchEgress
} from '@playliberty/api-client';
import type { EgressConfig } from '@playliberty/contracts';
import { EgressStatus } from '@playliberty/contracts';
import type {
  EgressNotice,
  Language,
  Messages,
  Translator
} from '@playliberty/i18n';
import {
  EgressAction,
  egressFailureNotice,
  egressReasonLabel,
  egressStatusLabel,
  egressSuccessNotice,
  egressTimeLabel,
  egressUnreachableNotice,
  useI18n
} from '@playliberty/i18n';
import { countryNameOf, countryOf, flagOf } from '@playliberty/ui-foundation';

import { useAnnouncement } from '../../../shared/a11y/useAnnouncement/useAnnouncement';
import Notice from '../../../shared/components/Notice/Notice';
import PressableScale from '../../../shared/components/PressableScale/PressableScale';
import ReadFailure from '../../../shared/components/ReadFailure';
import Screen from '../../../shared/components/Screen/Screen';
import {
  lineHeightFor,
  useTextScale
} from '../../../shared/styles/textMetrics';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens/tokens';

import { usePlayerBarHeight } from '../../../player/playerBarSize/PlayerBarSizeContext';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import { stackFacts } from './egressFacts';

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

interface FactProps {
  readonly label: string;
  readonly value: string;
  readonly sub?: string | null;
  readonly style?: StyleProp<ViewStyle>;
  readonly valueStyle?: StyleProp<TextStyle>;
}

/* One fact is one announcement: the label, the value and the sentence under it
 * are read once, and the painted pieces stay out of the tree. */
function Fact({ label, value, sub = null, style, valueStyle }: FactProps) {
  const scale = useTextScale();
  const name = [label, value, sub]
    .filter((part): part is string => part !== null)
    .join(', ');

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={name}
      style={style}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.factBody}>
        <Text
          style={[
            styles.label,
            { lineHeight: lineHeightFor('text-xs', 'leading-normal', scale) }
          ]}>
          {label}
        </Text>
        <Text
          style={[
            styles.value,
            valueStyle,
            { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
          ]}>
          {value}
        </Text>
        {sub === null ? null : (
          <Text
            style={[
              styles.sub,
              { lineHeight: lineHeightFor('text-xs', 'leading-normal', scale) }
            ]}>
            {sub}
          </Text>
        )}
      </View>
    </View>
  );
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

function ConfigCard({
  config,
  t,
  language,
  now,
  disabled,
  pending,
  onPress
}: ConfigCardProps) {
  const { fontScale } = useWindowDimensions();
  const scale = useTextScale();
  const stacked = stackFacts(fontScale);
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
      ? egressReasonLabel(t, config.lastError)
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
            style={[
              styles.flag,
              { lineHeight: lineHeightFor('text-md', 'leading-tight', scale) }
            ]}>
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
        <Fact
          label={t('egress.endpoint')}
          value={config.endpoint ?? t('egress.noEndpoint')}
          sub={observed}
        />
        <View style={[styles.factRow, stacked && styles.factRowStacked]}>
          <Fact
            label={t('egress.status')}
            value={egressStatusLabel(t, config.status)}
            valueStyle={{ color: statusTone(config.status) }}
            sub={reason}
            style={[styles.factHalf, stacked && styles.factHalfStacked]}
          />
          <Fact
            label={t('egress.lastAttempt')}
            value={egressTimeLabel(
              t,
              config.lastAttemptAt,
              now,
              'egress.neverAttempted'
            )}
            style={[styles.factHalf, stacked && styles.factHalfStacked]}
          />
        </View>
        <View style={[styles.factRow, stacked && styles.factRowStacked]}>
          <Fact
            label={t('egress.lastCheck')}
            value={egressTimeLabel(
              t,
              config.lastCheckAt,
              now,
              'egress.neverChecked'
            )}
            style={[styles.factHalf, stacked && styles.factHalfStacked]}
          />
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

/* The operator's pool: one card per exit, and one action runs at a time. */
export interface EgressScreenProps {
  readonly onBack: () => void;
}

export default function EgressScreen({ onBack }: EgressScreenProps) {
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const scale = useTextScale();
  const barHeight = usePlayerBarHeight();
  const egress = useEgress();
  const switchExit = useSwitchEgress();
  const check = useCheckEgress();
  const [notice, setNotice] = useState<EgressNotice | null>(null);
  const playerOffset =
    usePlayerStore(state => state.currentId) === null ? 0 : barHeight;
  const now = Date.now();
  const busy = switchExit.isPending || check.isPending;
  const loadingRegion = useAnnouncement(
    egress.isPending ? t('egress.loading') : null
  );
  const agentRegion = useAnnouncement(
    egress.data === undefined
      ? null
      : egress.data.agentReachable
        ? t('egress.agentUp')
        : t('egress.agentDown')
  );

  const detailOf = (error: Error): string | null =>
    error instanceof ApiError ? (error.problem?.detail ?? null) : null;

  const runSwitch = (name: string): void => {
    switchExit.mutate(name, {
      onSuccess: read => {
        if (!read.agentReachable) {
          setNotice(egressUnreachableNotice(t, EgressAction.Switch));
          return;
        }

        setNotice(egressSuccessNotice(t, EgressAction.Switch, name));
      },
      onError: error => {
        setNotice(egressFailureNotice(t, EgressAction.Switch, detailOf(error)));
      }
    });
  };

  const runCheck = (): void => {
    check.mutate(undefined, {
      onSuccess: read => {
        if (!read.agentReachable) {
          setNotice(egressUnreachableNotice(t, EgressAction.Check));
          return;
        }

        const active = read.configs.find(config => config.active)?.name ?? '';

        setNotice(egressSuccessNotice(t, EgressAction.Check, active));
      },
      onError: error => {
        setNotice(egressFailureNotice(t, EgressAction.Check, detailOf(error)));
      }
    });
  };

  if (egress.isPending) {
    return (
      <Screen
        testID="egress-screen"
        title={t('egress.title')}
        onBack={onBack}
        backLabel={t('common.back')}>
        <Text
          accessibilityLiveRegion={loadingRegion}
          style={[
            styles.say,
            { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
          ]}>
          {t('egress.loading')}
        </Text>
      </Screen>
    );
  }

  if (egress.isError) {
    return (
      <Screen
        testID="egress-screen"
        title={t('egress.title')}
        onBack={onBack}
        backLabel={t('common.back')}>
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
      <Screen
        testID="egress-screen"
        title={t('egress.title')}
        onBack={onBack}
        backLabel={t('common.back')}>
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
            accessibilityLiveRegion={agentRegion}
            style={[
              styles.agent,
              {
                lineHeight: lineHeightFor('text-sm', 'leading-normal', scale),
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
            <Text
              style={[
                styles.say,
                {
                  lineHeight: lineHeightFor('text-sm', 'leading-normal', scale)
                }
              ]}>
              {t('egress.empty')}
            </Text>
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
    /* A 7pt dot reads as a mark, not a control. */
    width: 7,
    height: 7,
    borderRadius: tokenLength('radius-chip')
  },
  agent: {
    flexShrink: 1,
    fontFamily,
    fontSize: tokenLength('text-sm')
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
    fontSize: tokenLength('text-lg')
  },
  name: {
    flexShrink: 1,
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: tokenWeight('weight-semibold')
  },
  active: {
    /* A 1pt vertical nudge keeps the badge on the text baseline. */
    paddingVertical: 1,
    paddingHorizontal: tokenLength('space-2'),
    color: tokenColor('egress'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    fontWeight: tokenWeight('weight-medium'),
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
  factRowStacked: {
    flexDirection: 'column',
    gap: tokenLength('space-2')
  },
  factBody: {
    gap: tokenLength('space-1')
  },
  factHalf: {
    flex: 1,
    minWidth: 0
  },
  factHalfStacked: {
    flex: 0,
    minWidth: 0
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
    fontVariant: ['tabular-nums']
  },
  sub: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
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
    fontWeight: tokenWeight('weight-semibold')
  },
  actionLabelDisabled: {
    color: tokenColor('control-disabled-fg')
  },
  say: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  }
});
