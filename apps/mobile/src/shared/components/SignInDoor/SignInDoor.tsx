import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@playliberty/i18n';

import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../styles/tokens';
import ShelfSleeves from './ShelfSleeves';

export interface SignInDoorProps {
  readonly busy?: boolean;
  readonly children?: ReactNode;
  readonly action?: ReactNode;
}

/** The app's signed-out surface: the shelf, the wordmark, the reason, one action. */
export default function SignInDoor({
  busy = false,
  children,
  action
}: SignInDoorProps) {
  const { t } = useI18n();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <ShelfSleeves busy={busy} />
          <Text style={styles.wordmark}>{t('app.name')}</Text>
          {children}
        </View>
        {action ?? <View style={styles.placeholder} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokenColor('bg')
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: tokenLength('space-5'),
    paddingTop: tokenLength('space-8'),
    paddingBottom: tokenLength('space-6'),
    gap: tokenLength('space-6')
  },
  top: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokenLength('space-3'),
    width: '100%'
  },
  placeholder: {
    minHeight: touchTarget
  },
  wordmark: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-2xl'),
    fontWeight: '600',
    lineHeight: tokenLength('text-2xl') * tokenNumber('leading-tight'),
    textAlign: 'center'
  }
});
