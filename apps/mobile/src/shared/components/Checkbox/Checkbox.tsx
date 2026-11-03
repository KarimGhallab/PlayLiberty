import { IconCheck } from '@tabler/icons-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../styles/tokens';

export interface CheckboxProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly hint?: string;
  readonly disabled?: boolean;
  readonly testID?: string;
}

/* A labelled checkbox row: the whole row is the target, the fill and the tick
 * arrive together, and the hint is read with the control, not after it. */
export default function Checkbox({
  label,
  checked,
  onChange,
  hint,
  disabled = false,
  testID
}: CheckboxProps) {
  const reduceMotion = useReduceMotion();
  const reveal = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const target = checked ? 1 : 0;

    if (reduceMotion) {
      reveal.setValue(target);
      return;
    }

    Animated.timing(reveal, {
      toValue: target,
      duration: tokenDuration('motion-base'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: true
    }).start();
  }, [reduceMotion, reveal, checked]);

  return (
    <View style={styles.block}>
      <Pressable
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        style={styles.row}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={() => onChange(!checked)}>
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.box,
            pressed && styles.boxPressed,
            disabled && styles.boxDisabled
          ]}>
          <Animated.View
            pointerEvents="none"
            style={[styles.fill, { opacity: reveal }]}
          />
          <Animated.View
            style={{
              opacity: reveal,
              transform: [
                {
                  scale: reveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1]
                  })
                }
              ]
            }}>
            <IconCheck
              size={tokenLength('icon-sm')}
              color={tokenColor('bg')}
              strokeWidth={2.5}
            />
          </Animated.View>
        </View>
        <Text style={styles.label}>{label}</Text>
      </Pressable>
      {hint === undefined ? null : (
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={styles.hint}>
          {hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: tokenLength('space-1')
  },
  row: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3')
  },
  box: {
    width: tokenLength('space-6'),
    height: tokenLength('space-6'),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokenColor('control-border'),
    borderRadius: tokenLength('radius-control')
  },
  /* The press reads on the box, not as a ripple across the whole row. */
  boxPressed: {
    opacity: 0.8
  },
  /* The label stays readable; only the control says it cannot move. */
  boxDisabled: {
    opacity: tokenNumber('opacity-disabled')
  },
  fill: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderWidth: 1,
    borderColor: tokenColor('accent'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('accent')
  },
  label: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md')
  },
  hint: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  }
});
