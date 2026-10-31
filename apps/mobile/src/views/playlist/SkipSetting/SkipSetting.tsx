import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { useI18n } from '@playliberty/i18n';
import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../../shared/a11y/useReduceMotion';
import Spinner from '../../../shared/components/Spinner/Spinner';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../../shared/styles/tokens';

const SWITCH_WIDTH = 40;
const SWITCH_HEIGHT = 22;
const SWITCH_BORDER = 1;
const THUMB_SIZE = 16;
const THUMB_INSET = 2;
const THUMB_TRAVEL =
  SWITCH_WIDTH - 2 * (SWITCH_BORDER + THUMB_INSET) - THUMB_SIZE;

export interface SkipSettingProps {
  readonly skipNonMusic: boolean;
  readonly canEdit: boolean;
  readonly saving?: boolean;
  readonly onChange: (skipNonMusic: boolean) => void;
}

/* The playlist's skip-non-music setting as a switch. A reader keeps the value
 * and the row, disabled, because the setting still says what the playlist
 * does. The change is not retroactive: it is the default for new tracks. */
export default function SkipSetting({
  skipNonMusic,
  canEdit,
  saving = false,
  onChange
}: SkipSettingProps) {
  const { t } = useI18n();
  const reduceMotion = useReduceMotion();
  const offset = useRef(new Animated.Value(skipNonMusic ? 1 : 0)).current;
  const disabled = !canEdit || saving;

  useEffect(() => {
    const target = skipNonMusic ? 1 : 0;

    if (reduceMotion) {
      offset.setValue(target);
      return;
    }

    Animated.timing(offset, {
      toValue: target,
      duration: tokenDuration('motion-fast'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: true
    }).start();
  }, [offset, reduceMotion, skipNonMusic]);

  return (
    <Pressable
      testID="skip-setting"
      accessibilityRole="switch"
      accessibilityLabel={t('skipSetting.label')}
      accessibilityState={{ checked: skipNonMusic, disabled, busy: saving }}
      disabled={disabled}
      style={styles.setting}
      onPress={() => onChange(!skipNonMusic)}>
      <Text
        accessible={false}
        importantForAccessibility="no"
        style={styles.label}>
        {t('skipSetting.label')}
      </Text>
      {saving ? <Spinner color={tokenColor('muted')} /> : null}
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.track,
          skipNonMusic && styles.trackOn,
          !canEdit && styles.dim
        ]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [
                {
                  translateX: offset.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, THUMB_TRAVEL]
                  })
                }
              ]
            }
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  setting: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3')
  },
  label: {
    flexShrink: 1,
    flexGrow: 1,
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '500',
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  },
  /* The thumb is a flex child, so the track centers it instead of a top
   * offset guessing where the border ends. */
  track: {
    width: SWITCH_WIDTH,
    height: SWITCH_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THUMB_INSET,
    borderWidth: SWITCH_BORDER,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('control-border')
  },
  trackOn: {
    borderColor: tokenColor('accent'),
    backgroundColor: tokenColor('accent')
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: tokenColor('ink')
  },
  dim: {
    opacity: tokenNumber('opacity-disabled')
  }
});
