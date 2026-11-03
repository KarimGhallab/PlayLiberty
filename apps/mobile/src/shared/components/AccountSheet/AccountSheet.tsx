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
  failure,
  onClose,
  onSignOut
}: AccountSheetProps) {
  const { t, language, setLanguage } = useI18n();
  const liveRegion = useAnnouncement(failure);
  const reduceMotion = useReduceMotion();
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
          <Text style={styles.failureText}>{failure}</Text>
        </View>
      )}

      {account === null ? null : (
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

      <Pressable
        testID="account-sign-out"
        accessibilityRole="button"
        style={styles.row}
        onPress={onSignOut}>
        <Text style={styles.rowDestructive}>{t('account.signOut')}</Text>
      </Pressable>
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
