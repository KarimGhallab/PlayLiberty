import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@playliberty/i18n';

import PrototypeSwitcher, {
  type PrototypeVariant
} from '../../../shared/components/PrototypeSwitcher/PrototypeSwitcher';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenNumber,
  touchTarget
} from '../../../shared/styles/tokens';

import { playerBarHeight } from '../../../player/playerBarSize/playerBarSize';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import LibraryShell from '../../library/LibraryShell/LibraryShell';

/* Prototype: the notice's success, error and neutral tones, switchable via
 * ?variant=, over the real gallery. Throwaway. */

type NoticeTone = 'success' | 'error' | 'neutral';

const VARIANTS: readonly PrototypeVariant[] = [
  { key: 'success', label: 'Success' },
  { key: 'error', label: 'Error' },
  { key: 'neutral', label: 'Neutral' }
];

function toneOf(value: string | undefined): NoticeTone {
  return value === 'error' || value === 'neutral' ? value : 'success';
}

export interface NoticePrototypeProps {
  readonly variant?: string;
  readonly onVariantChange: (variant: string) => void;
}

export default function NoticePrototype({
  variant,
  onVariantChange
}: NoticePrototypeProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const tone = toneOf(variant);
  const playerOffset =
    usePlayerStore(state => state.currentId) === null ? 0 : playerBarHeight;
  const copy =
    tone === 'success'
      ? { message: t('trackRow.linkCopied'), detail: 'Gerudo Valley' }
      : tone === 'error'
        ? { message: t('detail.deleteFailed'), detail: 'Froid' }
        : { message: t('playerBar.notificationRefused'), detail: null };

  if (!__DEV__) {
    return <LibraryShell />;
  }

  return (
    <>
      <LibraryShell />
      <View
        testID="prototype-notice"
        style={[
          styles.notice,
          { borderColor: toneColor(tone) },
          {
            bottom:
              insets.bottom +
              tokenLength('space-3') +
              playerOffset +
              touchTarget +
              tokenLength('space-3')
          }
        ]}>
        {tone === 'neutral' ? null : (
          <View style={styles.icon}>
            {tone === 'success' ? (
              <IconCircleCheck
                size={tokenLength('icon-md')}
                color={tokenColor('accent')}
              />
            ) : (
              <IconAlertCircle
                size={tokenLength('icon-md')}
                color={tokenColor('tone-failed')}
              />
            )}
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.message}>{copy.message}</Text>
          {copy.detail === null ? null : (
            <Text style={styles.detail}>{copy.detail}</Text>
          )}
        </View>
      </View>
      <PrototypeSwitcher
        variants={VARIANTS}
        current={tone}
        onChange={onVariantChange}
        bottomOffset={playerOffset}
      />
    </>
  );
}

function toneColor(tone: NoticeTone): string {
  if (tone === 'success') {
    return tokenColor('accent');
  }

  if (tone === 'error') {
    return tokenColor('tone-failed');
  }

  return tokenColor('control-border');
}

const styles = StyleSheet.create({
  notice: {
    position: 'absolute',
    left: tokenLength('space-4'),
    right: tokenLength('space-4'),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokenLength('space-2'),
    padding: tokenLength('space-3'),
    borderWidth: 1,
    borderRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface-raised')
  },
  icon: {
    paddingTop: 1
  },
  body: {
    flex: 1,
    gap: tokenLength('space-1')
  },
  message: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-sm'),
    fontWeight: '600',
    lineHeight: tokenLength('text-sm') * tokenNumber('leading-normal')
  },
  detail: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-xs'),
    lineHeight: tokenLength('text-xs') * tokenNumber('leading-normal')
  }
});
