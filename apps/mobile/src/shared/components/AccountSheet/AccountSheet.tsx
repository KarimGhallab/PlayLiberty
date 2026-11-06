import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { type Account, UserRole } from '@playliberty/contracts';
import { Language, useI18n } from '@playliberty/i18n';
import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useAnnouncement } from '../../a11y/useAnnouncement';
import { useReduceMotion } from '../../a11y/useReduceMotion';
import { lineHeightFor, useTextScale } from '../../styles/textMetrics';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../styles/tokens';
import AccountAvatar from '../AccountAvatar/AccountAvatar';
import Sheet from '../Sheet/Sheet';

export interface AccountSheetProps {
  readonly visible: boolean;
  readonly account: Account | null;
  readonly loading: boolean;
  readonly failure: string | null;
  readonly onClose: () => void;
  readonly onSignOut: () => void;
}

const LANGUAGES = [
  { value: Language.English, label: 'language.english' },
  { value: Language.French, label: 'language.french' }
] as const;

/* The account's one settings surface. The egress console is an instance-level
 * door and lives in the library header, not here. */

export default function AccountSheet({
  visible,
  account,
  loading,
  failure,
  onClose,
  onSignOut
}: AccountSheetProps) {
  const { t, language, setLanguage } = useI18n();
  const scale = useTextScale();
  const liveRegion = useAnnouncement(failure);
  const loadingLiveRegion = useAnnouncement(
    loading && account === null ? t('account.loading') : null
  );
  const reduceMotion = useReduceMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const [arming, setArming] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  const ask = t('account.signOutAsk');
  const askLiveRegion = useAnnouncement(arming ? ask : null);
  const thumb = useRef(new Animated.Value(0)).current;
  const positioned = useRef(false);
  const selectedIndex = Math.max(
    0,
    LANGUAGES.findIndex(option => option.value === language)
  );
  const thumbWidth = Math.max(0, (trackWidth - tokenLength('space-1') * 3) / 2);

  /* A fresh open must not inherit the last question. */
  if (visible !== wasVisible) {
    setWasVisible(visible);
    setArming(false);
  }

  useEffect(() => {
    if (trackWidth === 0) {
      return;
    }

    const target = selectedIndex * (thumbWidth + tokenLength('space-1'));

    if (!positioned.current || reduceMotion) {
      positioned.current = true;
      thumb.setValue(target);
      return;
    }

    Animated.timing(thumb, {
      toValue: target,
      duration: tokenDuration('motion-base'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: true
    }).start();
  }, [reduceMotion, selectedIndex, thumb, thumbWidth, trackWidth]);

  return (
    <Sheet
      visible={visible}
      title={t('account.title')}
      onRequestClose={onClose}
      closeLabel={t('common.close')}
      testID="account-sheet"
      backdropTestID="account-backdrop">
      {failure === null ? null : (
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion={liveRegion}
          style={styles.failure}>
          <Text
            style={[
              styles.failureText,
              { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
            ]}>
            {failure}
          </Text>
        </View>
      )}

      {account === null ? (
        loading ? (
          <View
            testID="account-identity-loading"
            accessible
            accessibilityRole="text"
            accessibilityLabel={t('account.loading')}
            accessibilityLiveRegion={loadingLiveRegion}
            style={[styles.identity, styles.identityLoading]}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.identityShape}>
              <View style={styles.avatarPlaceholder} />
              <View style={styles.lines}>
                <View style={styles.namePlaceholder} />
                <View style={styles.markPlaceholder} />
              </View>
            </View>
          </View>
        ) : null
      ) : (
        <View style={styles.identity}>
          <AccountAvatar account={account} />
          <View style={styles.who}>
            <Text style={styles.name}>{account.displayName}</Text>
            {account.role === UserRole.Admin ? (
              <Text style={styles.mark}>{t('account.admin')}</Text>
            ) : null}
          </View>
        </View>
      )}

      <View style={styles.languageBlock}>
        <Text style={styles.label}>{t('language.label')}</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('language.label')}
          style={styles.segmentTrack}
          onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.segmentThumb,
              { width: thumbWidth, transform: [{ translateX: thumb }] }
            ]}
          />
          {LANGUAGES.map(option => {
            const selected = language === option.value;

            return (
              <Pressable
                key={option.value}
                testID={`language-${option.value}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={styles.segment}
                onPress={() => setLanguage(option.value)}>
                <Text
                  style={[
                    styles.segmentLabel,
                    selected && styles.segmentLabelSelected
                  ]}>
                  {t(option.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.hairline} />

      {arming ? (
        <View style={styles.confirm}>
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion={askLiveRegion}
            style={[
              styles.ask,
              { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
            ]}>
            {ask}
          </Text>
          <View style={styles.confirmActions}>
            <Pressable
              testID="account-sign-out-cancel"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cancel,
                pressed && styles.cancelPressed
              ]}
              onPress={() => setArming(false)}>
              <Text style={styles.cancelLabel}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              testID="account-sign-out-confirm"
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.confirmAction,
                pressed && styles.confirmPressed
              ]}
              onPress={onSignOut}>
              <Text style={styles.confirmLabel}>{t('account.signOut')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          testID="account-sign-out"
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => setArming(true)}>
          <Text style={styles.rowDestructive}>{t('account.signOut')}</Text>
        </Pressable>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3'),
    marginTop: tokenLength('space-3')
  },
  identityLoading: {
    minHeight: tokenLength('space-9')
  },
  identityShape: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3')
  },
  avatarPlaceholder: {
    width: tokenLength('space-9'),
    height: tokenLength('space-9'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  lines: {
    flex: 1,
    gap: tokenLength('space-1')
  },
  namePlaceholder: {
    width: '55%',
    height: tokenLength('text-md'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  markPlaceholder: {
    width: '30%',
    height: tokenLength('text-xs'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  who: {
    flexShrink: 1,
    gap: tokenLength('space-1')
  },
  name: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: tokenWeight('weight-semibold')
  },
  mark: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  languageBlock: {
    gap: tokenLength('space-2'),
    marginTop: tokenLength('space-3'),
    paddingBottom: tokenLength('space-3')
  },
  label: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  segmentTrack: {
    flexDirection: 'row',
    gap: tokenLength('space-1'),
    padding: tokenLength('space-1'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  segmentThumb: {
    position: 'absolute',
    top: tokenLength('space-1'),
    bottom: tokenLength('space-1'),
    left: tokenLength('space-1'),
    borderWidth: 1,
    borderColor: tokenColor('accent'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('current-surface')
  },
  segment: {
    flex: 1,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokenLength('radius-chip')
  },
  segmentLabel: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  segmentLabelSelected: {
    color: tokenColor('ink'),
    fontWeight: tokenWeight('weight-medium')
  },
  hairline: {
    height: 1,
    marginHorizontal: -tokenLength('space-5'),
    backgroundColor: tokenColor('line')
  },
  row: {
    minHeight: touchTarget,
    justifyContent: 'center'
  },
  rowDestructive: {
    color: tokenColor('tone-failed'),
    fontFamily,
    fontSize: tokenLength('text-md')
  },
  confirm: {
    gap: tokenLength('space-2'),
    paddingVertical: tokenLength('space-2')
  },
  ask: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokenLength('space-2')
  },
  cancel: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-4'),
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  cancelLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  },
  cancelPressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  confirmAction: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-4'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('tone-failed')
  },
  confirmPressed: {
    opacity: tokenNumber('opacity-disabled')
  },
  confirmLabel: {
    color: tokenColor('bg'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium')
  },
  rowPressed: {
    backgroundColor: tokenColor('surface-raised')
  },
  failure: {
    padding: tokenLength('space-3'),
    marginTop: tokenLength('space-3'),
    borderWidth: 1,
    borderColor: tokenColor('tone-failed'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('surface-raised')
  },
  failureText: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  }
});
