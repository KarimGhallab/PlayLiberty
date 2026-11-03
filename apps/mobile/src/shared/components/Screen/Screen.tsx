import { IconChevronLeft } from '@tabler/icons-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  tokenWeight,
  touchTarget
} from '../../styles/tokens';
import PressableScale from '../PressableScale/PressableScale';

export interface ScreenProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly testID?: string;
  /** Draws the way back before the title; the caller owns the sentence. */
  readonly onBack?: () => void;
  readonly backLabel?: string;
  readonly children?: ReactNode;
}

/** The app's screen frame: the page ground, one inset, and a named heading. */
export default function Screen({
  title,
  subtitle,
  testID,
  onBack,
  backLabel,
  children
}: ScreenProps) {
  const heading =
    title === undefined ? null : (
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
    );

  return (
    <SafeAreaView
      testID={testID}
      style={styles.screen}
      edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {onBack === undefined ? (
          heading
        ) : (
          <View style={styles.heading}>
            <PressableScale
              testID="screen-back"
              accessibilityRole="button"
              accessibilityLabel={backLabel}
              style={styles.back}
              onPress={onBack}>
              <IconChevronLeft
                size={tokenLength('icon-md')}
                color={tokenColor('ink')}
              />
            </PressableScale>
            {title === undefined ? null : (
              <Text
                accessibilityRole="header"
                style={[styles.title, styles.headingTitle]}>
                {title}
              </Text>
            )}
          </View>
        )}
        {subtitle === undefined ? null : (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokenColor('bg')
  },
  content: {
    flex: 1,
    padding: tokenLength('space-4'),
    gap: tokenLength('space-3')
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  },
  headingTitle: {
    flexShrink: 1
  },
  back: {
    width: touchTarget,
    height: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    /* The glyph aligns with the title's edge; the target reaches into the
     * margin. */
    marginLeft: -(touchTarget - tokenLength('icon-md')) / 2
  },
  title: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-xl'),
    fontWeight: tokenWeight('weight-semibold'),
    lineHeight: tokenLength('text-xl') * tokenNumber('leading-tight')
  },
  subtitle: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  }
});
