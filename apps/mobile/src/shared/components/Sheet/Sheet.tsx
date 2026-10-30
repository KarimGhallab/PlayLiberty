import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { standardEasingBezier } from '@playliberty/ui-foundation';

import { useReduceMotion } from '../../a11y/useReduceMotion';
import {
  fontFamily,
  tokenColor,
  tokenDuration,
  tokenLength,
  touchTarget
} from '../../styles/tokens';

export interface SheetProps {
  readonly visible: boolean;
  readonly title: string;
  readonly onRequestClose: () => void;
  readonly testID: string;
  readonly backdropTestID: string;
  readonly children: ReactNode;
}

const DISMISS_DISTANCE = tokenLength('space-8') * 2;
const DISMISS_VELOCITY = 0.5;

/** A long drag or a fast flick asks the sheet to close. */
export function dismissesOnDrag(dy: number, vy: number): boolean {
  return dy > DISMISS_DISTANCE || vy > DISMISS_VELOCITY;
}

/* The app's one modal frame. A caller supplies the title, the content and the
 * close request, so a sheet that cannot dismiss while busy stays open. */
export default function Sheet({
  visible,
  title,
  onRequestClose,
  testID,
  backdropTestID,
  children
}: SheetProps) {
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  const drag = useMemo(() => {
    const settle = (): void => {
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
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => {
        if (dismissesOnDrag(gesture.dy, gesture.vy)) {
          closeRef.current();
        }

        settle();
      },
      onPanResponderTerminate: settle
    });
  }, [reduceMotion, translateY]);

  return (
    <Modal
      visible={visible}
      onRequestClose={onRequestClose}
      animationType={reduceMotion ? 'none' : 'slide'}
      transparent>
      <View style={styles.scrim}>
        <Pressable
          testID={backdropTestID}
          accessible={false}
          importantForAccessibility="no"
          style={StyleSheet.absoluteFill}
          onPress={onRequestClose}
        />
        <Animated.View
          testID={testID}
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + tokenLength('space-4'),
              transform: [{ translateY }]
            }
          ]}>
          <View
            testID={`${testID}-handle`}
            style={styles.handleArea}
            {...drag.panHandlers}>
            <View style={styles.handle} />
          </View>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
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
    justifyContent: 'center',
    minHeight: touchTarget
  },
  title: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-lg'),
    fontWeight: '600'
  }
});
