import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Account, UserRole } from '@playliberty/contracts';
import { Language, useI18n } from '@playliberty/i18n';
import { sleeveIndex, standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../styles/tokens';

export interface AccountSheetProps {
  readonly visible: boolean;
  readonly account: Account | null;
  readonly failure: string | null;
  readonly onClose: () => void;
  readonly onSignOut: () => void;
}

const LANGUAGES = [
  { value: Language.English, label: 'language.english' },
  { value: Language.French, label: 'language.french' }
] as const;

const SLEEVES = [
  'sleeve-1',
  'sleeve-2',
  'sleeve-3',
  'sleeve-4',
  'sleeve-5',
  'sleeve-6'
] as const;

const DISMISS_DISTANCE = tokenLength('space-8') * 2;
const DISMISS_VELOCITY = 0.5;

/* The account's one settings surface. The egress console is an instance-level
 * door and lives in the library header, not here. */

export default function AccountSheet({
  visible,
  account,
  failure,
  onClose,
  onSignOut
}: AccountSheetProps) {
  const { t, language, setLanguage } = useI18n();
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  const drag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          translateY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
            closeRef.current();
            return;
          }

          if (reduceMotion) {
            translateY.setValue(0);
            return;
          }

          Animated.timing(translateY, {
            toValue: 0,
            duration: tokenDuration('motion-base'),
            easing: Easing.bezier(...standardEasingBezier),
            useNativeDriver: false
          }).start();
        },
        onPanResponderTerminate: () => {
          translateY.setValue(0);
        }
      }),
    [reduceMotion, translateY]
  );

  const [trackWidth, setTrackWidth] = useState(0);
  const thumb = useRef(new Animated.Value(0)).current;
  const positioned = useRef(false);
  const selectedIndex = Math.max(
    0,
    LANGUAGES.findIndex(option => option.value === language)
  );
  const thumbWidth = Math.max(0, (trackWidth - tokenLength('space-1') * 3) / 2);

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
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType={reduceMotion ? 'none' : 'slide'}
      transparent>
      <View style={styles.scrim}>
        <Pressable
          testID="account-backdrop"
          accessible={false}
          importantForAccessibility="no"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Animated.View
          testID="account-sheet"
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + tokenLength('space-4'),
              transform: [{ translateY }]
            }
          ]}>
          <View style={styles.handleArea} {...drag.panHandlers}>
            <View style={styles.handle} />
          </View>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {t('account.title')}
            </Text>
          </View>

          {failure === null ? null : (
            <View
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={styles.failure}>
              <Text style={styles.failureText}>{failure}</Text>
            </View>
          )}

          {account === null ? null : (
            <View style={styles.identity}>
              <Avatar account={account} />
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
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
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

          <Pressable
            testID="account-sign-out"
            accessibilityRole="button"
            style={styles.row}
            onPress={onSignOut}>
            <Text style={styles.rowDestructive}>{t('account.signOut')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Avatar({ account }: { readonly account: Account }) {
  if (account.avatarUrl === null) {
    return <Monogram account={account} />;
  }

  return (
    <Image
      accessible={false}
      testID="account-avatar"
      source={{ uri: account.avatarUrl }}
      style={styles.avatar}
    />
  );
}

function Monogram({ account }: { readonly account: Account }) {
  const initial = account.displayName.trim().charAt(0).toUpperCase() || '?';
  const tone = SLEEVES[sleeveIndex(account.id) - 1] ?? 'sleeve-1';

  return (
    <View style={[styles.monogram, { backgroundColor: tokenColor(tone) }]}>
      <Text style={styles.monogramLabel}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: tokenColor('scrim')
  },
  sheet: {
    paddingHorizontal: tokenLength('space-5'),
    borderTopLeftRadius: tokenLength('radius-card'),
    borderTopRightRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface')
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: tokenLength('space-3'),
    paddingBottom: tokenLength('space-2')
  },
  handle: {
    width: tokenLength('space-7'),
    height: tokenLength('space-1'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('control-border')
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTarget
  },
  title: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-lg'),
    fontWeight: '600'
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3'),
    marginTop: tokenLength('space-3')
  },
  avatar: {
    width: tokenLength('space-9'),
    height: tokenLength('space-9'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  monogram: {
    width: tokenLength('space-9'),
    height: tokenLength('space-9'),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokenLength('radius-chip')
  },
  monogramLabel: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-lg'),
    fontWeight: '600'
  },
  who: {
    flexShrink: 1,
    gap: tokenLength('space-1')
  },
  name: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: '600'
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
    fontWeight: '500'
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
    fontSize: tokenLength('text-sm'),
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  }
});
