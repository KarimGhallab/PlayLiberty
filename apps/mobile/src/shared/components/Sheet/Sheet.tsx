import { IconX } from '@tabler/icons-react-native';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
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
  tokenWeight,
  touchTarget
} from '../../styles/tokens';
import PressableScale from '../PressableScale/PressableScale';

export interface SheetProps {
  readonly visible: boolean;
  readonly title: string;
  readonly onRequestClose: () => void;
  readonly onExited?: () => void;
  readonly closeLabel: string;
  readonly testID: string;
  readonly backdropTestID: string;
  readonly children: ReactNode;
  /** The actions that stay on screen while the body scrolls. */
  readonly footer?: ReactNode;
}

const DISMISS_DISTANCE = tokenLength('space-8') * 2;
const DISMISS_VELOCITY = 0.5;
const EASE = Easing.bezier(...standardEasingBezier);

/** A long drag or a fast flick asks the sheet to close. */
export function dismissesOnDrag(dy: number, vy: number): boolean {
  return dy > DISMISS_DISTANCE || vy > DISMISS_VELOCITY;
}

/*
 * The app's one modal frame. The scrim fades over the frame while the sheet
 * rises from the bottom, so the darkening is air rather than a moving panel.
 * The frame owns the exit too, and unmounts only when it finishes.
 */
export default function Sheet({
  visible,
  title,
  onRequestClose,
  onExited,
  closeLabel,
  testID,
  backdropTestID,
  children,
  footer
}: SheetProps) {
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const [rendered, setRendered] = useState(visible);
  const [height, setHeight] = useState(0);
  const entered = useRef(false);
  const exiting = useRef(false);
  const motion = useRef(0);
  const windowHeight = useRef(Dimensions.get('window').height).current;
  const translateY = useRef(
    new Animated.Value(visible ? windowHeight : 0)
  ).current;
  const scrimOpacity = useRef(new Animated.Value(visible ? 0 : 1)).current;
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;
  const exitedRef = useRef(onExited);
  exitedRef.current = onExited;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      exiting.current = false;

      if (!rendered) {
        translateY.setValue(height > 0 ? height : windowHeight);
        scrimOpacity.setValue(0);
        return;
      }

      if (entered.current || height === 0) {
        return;
      }

      entered.current = true;
      motion.current += 1;

      if (reduceMotion) {
        translateY.setValue(0);
        scrimOpacity.setValue(1);
        return;
      }

      translateY.setValue(height);
      scrimOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: tokenDuration('motion-base'),
          easing: EASE,
          useNativeDriver: true
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: tokenDuration('motion-base'),
          easing: EASE,
          useNativeDriver: true
        })
      ]).start();
      return;
    }

    entered.current = false;

    if (!rendered || exiting.current) {
      return;
    }

    exiting.current = true;
    const token = ++motion.current;
    const travel = height > 0 ? height : windowHeight;

    if (reduceMotion) {
      translateY.setValue(travel);
      scrimOpacity.setValue(0);
      exiting.current = false;
      setRendered(false);
      exitedRef.current?.();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: travel,
        duration: tokenDuration('motion-fast'),
        easing: EASE,
        useNativeDriver: true
      }),
      Animated.timing(scrimOpacity, {
        toValue: 0,
        duration: tokenDuration('motion-fast'),
        easing: EASE,
        useNativeDriver: true
      })
    ]).start(({ finished }) => {
      exiting.current = false;

      if (finished && motion.current === token) {
        setRendered(false);
        exitedRef.current?.();
      }
    });
  }, [
    height,
    reduceMotion,
    rendered,
    scrimOpacity,
    translateY,
    visible,
    windowHeight
  ]);

  const drag = useMemo(() => {
    const settle = (): void => {
      if (reduceMotion) {
        translateY.setValue(0);
        scrimOpacity.setValue(1);
        return;
      }

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: tokenDuration('motion-base'),
          easing: EASE,
          useNativeDriver: true
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: tokenDuration('motion-base'),
          easing: EASE,
          useNativeDriver: true
        })
      ]).start();
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const dy = Math.max(0, gesture.dy);
        translateY.setValue(dy);
        scrimOpacity.setValue(Math.max(0, 1 - dy / Math.max(1, height)));
      },
      onPanResponderRelease: (_, gesture) => {
        if (dismissesOnDrag(gesture.dy, gesture.vy)) {
          closeRef.current();
        }

        settle();
      },
      onPanResponderTerminate: settle
    });
  }, [height, reduceMotion, scrimOpacity, translateY]);

  return (
    <Modal
      visible={rendered}
      onRequestClose={onRequestClose}
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.scrim}>
        <Animated.View
          testID={`${testID}-scrim`}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.scrimFill,
            { opacity: scrimOpacity }
          ]}
        />
        <Pressable
          testID={backdropTestID}
          accessible={false}
          importantForAccessibility="no"
          style={StyleSheet.absoluteFill}
          onPress={onRequestClose}
        />
        <Animated.View
          testID={testID}
          onLayout={event => setHeight(event.nativeEvent.layout.height)}
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
            <PressableScale
              testID={`${testID}-close`}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              style={styles.close}
              onPress={onRequestClose}>
              <IconX size={tokenLength('icon-md')} color={tokenColor('ink')} />
            </PressableScale>
          </View>
          <ScrollView
            testID={`${testID}-body`}
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer === undefined ? null : (
            <View style={styles.footer}>{footer}</View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  scrimFill: {
    backgroundColor: tokenColor('scrim')
  },
  /* A body taller than the room left above the keyboard shrinks and scrolls
   * itself, so the sheet's actions never leave the screen. */
  sheet: {
    maxHeight: '90%',
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
    gap: tokenLength('space-2'),
    minHeight: touchTarget
  },
  title: {
    flexShrink: 1,
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-lg'),
    fontWeight: tokenWeight('weight-semibold')
  },
  close: {
    width: touchTarget,
    height: touchTarget,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    /* The glyph aligns with the sheet's content edge; the target reaches into
     * the padding. */
    marginRight: -(touchTarget - tokenLength('icon-md')) / 2
  },
  body: {
    flexShrink: 1
  },
  footer: {
    flexShrink: 0
  }
});
