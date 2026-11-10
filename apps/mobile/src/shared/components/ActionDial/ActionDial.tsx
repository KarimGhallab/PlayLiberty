import {
  IconMusicPlus,
  IconPlus,
  IconRotate
} from '@tabler/icons-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion/useReduceMotion';
import { contentColumn } from '../../styles/contentColumn';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
  tokenLength,
  tokenWeight,
  touchTarget
} from '../../styles/tokens/tokens';
import Spinner from '../Spinner';

export type DialIcon = 'add' | 'sync';

export interface DialAction {
  readonly key: string;
  readonly testID: string;
  readonly label: string;
  readonly icon: DialIcon;
  /** A one-line reason under the label, such as an excluded set. */
  readonly detail?: string;
  /** The action's own mark: the accent border and glyph. */
  readonly accent?: boolean;
  readonly busy?: boolean;
  readonly onPress: () => void;
}

export interface ActionDialProps {
  readonly label: string;
  readonly testID: string;
  readonly actions: readonly DialAction[];
  /** The surface is busy: the trigger is a spinner and takes no press. */
  readonly busy?: boolean;
  readonly bottomOffset?: number;
  readonly rightOffset?: number;
}

/** The trigger's box, which the screens clear under their last row. */
export const actionDialSize = tokenLength('space-9') + tokenLength('space-2');

/*
 * A floating action that opens into the screen's own verbs. Rows are in display
 * order, top first. The trigger keeps the plus because adding is the point.
 */
export default function ActionDial({
  label,
  testID,
  actions,
  busy = false,
  bottomOffset = 0,
  rightOffset = 0
}: ActionDialProps) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const [open, setOpen] = useState(false);
  const column = contentColumn(window.width, insets.left, insets.right);
  /* The label starts at the content inset and wraps rather than leaving the
   * screen on a long locale. */
  const labelMax = Math.max(
    0,
    column.width -
      tokenLength('space-4') * 2 -
      rightOffset -
      actionDialSize -
      tokenLength('space-2')
  );
  const reveal = useRef(new Animated.Value(0)).current;
  const shown = open && !busy;
  const rise = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [tokenLength('space-3'), 0]
  });
  const turn = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg']
  });

  useEffect(() => {
    const target = shown ? 1 : 0;

    if (reduceMotion) {
      reveal.setValue(target);
      return;
    }

    Animated.timing(reveal, {
      toValue: target,
      duration: tokenDuration('motion-fast'),
      easing: Easing.bezier(...standardEasingBezier),
      useNativeDriver: true
    }).start();
  }, [reduceMotion, reveal, shown]);

  /* A surface that starts syncing from elsewhere takes the menu with it. */
  useEffect(() => {
    if (busy) {
      setOpen(false);
    }
  }, [busy]);

  const close = (): void => setOpen(false);

  return (
    <>
      {shown ? (
        <Pressable
          testID={`${testID}-scrim`}
          accessible={false}
          importantForAccessibility="no"
          style={StyleSheet.absoluteFill}
          onPress={close}
        />
      ) : null}
      <View
        testID={`${testID}-dial`}
        pointerEvents="box-none"
        style={[
          styles.dial,
          {
            right: rightOffset,
            bottom: insets.bottom + tokenLength('space-4') + bottomOffset
          }
        ]}>
        <Animated.View
          pointerEvents={shown ? 'auto' : 'none'}
          importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
          accessibilityElementsHidden={!shown}
          style={[
            styles.stack,
            { opacity: reveal, transform: [{ translateY: rise }] }
          ]}>
          {actions.map(action => (
            <Pressable
              key={action.key}
              testID={action.testID}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityHint={action.detail}
              accessibilityState={{
                disabled: action.busy ?? false,
                busy: action.busy ?? false
              }}
              disabled={action.busy ?? false}
              style={styles.row}
              onPress={() => {
                close();
                action.onPress();
              }}>
              {({ pressed }) => (
                <>
                  <View
                    style={[
                      styles.label,
                      { maxWidth: labelMax },
                      pressed && styles.pressed
                    ]}>
                    <Text numberOfLines={2} style={styles.labelText}>
                      {action.label}
                    </Text>
                    {action.detail === undefined ? null : (
                      <Text numberOfLines={1} style={styles.detailText}>
                        {action.detail}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.action,
                      action.accent === true
                        ? styles.accentAction
                        : styles.plain,
                      pressed && styles.pressed
                    ]}>
                    {action.busy === true ? (
                      <Spinner
                        color={
                          action.accent === true
                            ? tokenColor('accent')
                            : tokenColor('ink')
                        }
                      />
                    ) : action.icon === 'add' ? (
                      <IconMusicPlus
                        size={tokenLength('icon-md')}
                        color={
                          action.accent === true
                            ? tokenColor('bg')
                            : tokenColor('ink')
                        }
                      />
                    ) : (
                      <IconRotate
                        size={tokenLength('icon-md')}
                        color={
                          action.accent === true
                            ? tokenColor('accent')
                            : tokenColor('ink')
                        }
                      />
                    )}
                  </View>
                </>
              )}
            </Pressable>
          ))}
        </Animated.View>
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded: shown, disabled: busy, busy }}
          disabled={busy}
          style={({ pressed }) => [
            styles.trigger,
            pressed && styles.triggerPressed
          ]}
          onPress={() => setOpen(current => !current)}>
          {busy ? (
            <View style={styles.triggerSpinner}>
              <Spinner color={tokenColor('bg')} />
            </View>
          ) : (
            <Animated.View style={{ transform: [{ rotate: turn }] }}>
              <IconPlus
                size={tokenLength('icon-lg')}
                color={tokenColor('bg')}
              />
            </Animated.View>
          )}
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dial: {
    position: 'absolute',
    alignItems: 'flex-end'
  },
  stack: {
    alignItems: 'flex-end',
    gap: tokenLength('space-2'),
    marginBottom: tokenLength('space-2')
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  },
  label: {
    minHeight: touchTarget,
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-3'),
    paddingVertical: tokenLength('space-1'),
    borderWidth: 1,
    borderColor: tokenColor('line'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  labelText: {
    flexShrink: 1,
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: tokenWeight('weight-medium')
  },
  detailText: {
    flexShrink: 1,
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs')
  },
  action: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  accentAction: {
    borderColor: tokenColor('accent')
  },
  plain: {
    borderColor: tokenColor('line')
  },
  pressed: {
    backgroundColor: tokenColor('current-surface')
  },
  trigger: {
    width: actionDialSize,
    height: actionDialSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokenColor('accent'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('accent')
  },
  triggerPressed: {
    borderColor: tokenColor('accent-hover'),
    backgroundColor: tokenColor('accent-hover')
  },
  triggerSpinner: {
    transform: [{ scale: 1.5 }]
  }
});
