import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fontFamily,
  tokenColor,
  tokenLength,
  touchTarget
} from '../../styles/tokens';

export interface PrototypeVariant {
  readonly key: string;
  readonly label: string;
}

export interface PrototypeSwitcherProps {
  readonly variants: readonly PrototypeVariant[];
  readonly current: string;
  readonly onChange: (key: string) => void;
  /** Space the bar must clear under it, such as the player bar. */
  readonly bottomOffset?: number;
  readonly testID?: string;
}

/* Throwaway chrome: a pill that cycles a prototype's variants. */
export default function PrototypeSwitcher({
  variants,
  current,
  onChange,
  bottomOffset = 0,
  testID = 'prototype-switcher'
}: PrototypeSwitcherProps) {
  const insets = useSafeAreaInsets();
  const index = Math.max(
    0,
    variants.findIndex(variant => variant.key === current)
  );
  const active = variants[index];

  const step = (offset: number): void => {
    const next = variants[(index + offset + variants.length) % variants.length];

    if (next !== undefined) {
      onChange(next.key);
    }
  };

  return (
    <View
      testID={testID}
      style={[
        styles.bar,
        { bottom: insets.bottom + tokenLength('space-3') + bottomOffset }
      ]}>
      <Pressable
        testID={`${testID}-previous`}
        accessibilityRole="button"
        accessibilityLabel="Previous variant"
        style={styles.arrow}
        onPress={() => step(-1)}>
        <IconChevronLeft
          size={tokenLength('icon-md')}
          color={tokenColor('ink')}
        />
      </Pressable>
      <Text numberOfLines={1} style={styles.label}>
        PROTOTYPE · {active?.label ?? current}
      </Text>
      <Pressable
        testID={`${testID}-next`}
        accessibilityRole="button"
        accessibilityLabel="Next variant"
        style={styles.arrow}
        onPress={() => step(1)}>
        <IconChevronRight
          size={tokenLength('icon-md')}
          color={tokenColor('ink')}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2'),
    height: touchTarget,
    paddingHorizontal: tokenLength('space-2'),
    borderWidth: 1,
    borderColor: tokenColor('egress-border'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('egress-surface')
  },
  arrow: {
    width: tokenLength('control-touch'),
    height: tokenLength('control-touch'),
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    color: tokenColor('egress'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '600'
  }
});
