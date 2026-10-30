import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber
} from '../../styles/tokens';

export interface ScreenProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly children?: ReactNode;
}

/** The app's screen frame: the page ground, one inset, and a named heading. */
export default function Screen({ title, subtitle, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {title === undefined ? null : (
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
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
  title: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-xl'),
    fontWeight: '600',
    lineHeight: tokenLength('text-xl') * tokenNumber('leading-tight')
  },
  subtitle: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  }
});
