import { IconChevronLeft } from '@tabler/icons-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MAX_CONTENT_WIDTH } from '../../styles/contentColumn';
import { lineHeightFor, useTextScale } from '../../styles/textMetrics';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenWeight,
  touchTarget
} from '../../styles/tokens/tokens';
import PressableScale from '../PressableScale/PressableScale';

export interface ScreenProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly testID?: string;
  /** Draws the way back before the title; the caller owns the sentence. */
  readonly onBack?: () => void;
  readonly backLabel?: string;
  /** Hides the whole frame from assistive technology while a route covers it. */
  readonly covered?: boolean;
  readonly children?: ReactNode;
}

/** The app's screen frame: the page ground, one inset, and a named heading. */
export default function Screen({
  title,
  subtitle,
  testID,
  onBack,
  backLabel,
  covered = false,
  children
}: ScreenProps) {
  const scale = useTextScale();
  const titleStyle = [
    styles.title,
    { lineHeight: lineHeightFor('text-xl', 'leading-tight', scale) }
  ];
  const heading =
    title === undefined ? null : (
      <Text accessibilityRole="header" style={titleStyle}>
        {title}
      </Text>
    );

  return (
    <SafeAreaView
      testID={testID}
      style={styles.screen}
      accessibilityElementsHidden={covered}
      importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
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
                style={[...titleStyle, styles.headingTitle]}>
                {title}
              </Text>
            )}
          </View>
        )}
        {subtitle === undefined ? null : (
          <Text
            style={[
              styles.subtitle,
              { lineHeight: lineHeightFor('text-sm', 'leading-normal', scale) }
            ]}>
            {subtitle}
          </Text>
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
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
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
    fontWeight: tokenWeight('weight-semibold')
  },
  subtitle: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm')
  }
});
