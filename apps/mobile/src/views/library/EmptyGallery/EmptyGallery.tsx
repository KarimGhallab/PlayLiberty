import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import {
  lineHeightFor,
  useTextScale
} from '../../../shared/styles/textMetrics';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenWeight,
  touchTarget
} from '../../../shared/styles/tokens';

export interface EmptyGalleryProps {
  readonly onAdd: () => void;
}

/* A different body from the playlist's empty state: that one syncs a playlist
 * that exists, this one has nothing to sync. */
export default function EmptyGallery({ onAdd }: EmptyGalleryProps) {
  const { t } = useI18n();
  const scale = useTextScale();

  return (
    <View style={styles.empty}>
      <Text accessibilityRole="header" style={styles.heading}>
        {t('library.empty.heading')}
      </Text>
      <Text
        style={[
          styles.promise,
          { lineHeight: lineHeightFor('text-md', 'leading-relaxed', scale) }
        ]}>
        {t('library.empty.promise')}
      </Text>
      <Pressable
        testID="empty-add"
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.action,
          pressed && styles.actionPressed
        ]}
        onPress={onAdd}>
        <Text style={styles.actionLabel}>{t('library.add')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokenLength('space-4')
  },
  heading: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-lg'),
    fontWeight: tokenWeight('weight-semibold'),
    textAlign: 'center'
  },
  promise: {
    color: tokenColor('muted'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    textAlign: 'center'
  },
  action: {
    minHeight: touchTarget,
    minWidth: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokenLength('space-5'),
    borderRadius: tokenLength('radius-control'),
    backgroundColor: tokenColor('accent')
  },
  actionPressed: {
    backgroundColor: tokenColor('accent-hover')
  },
  actionLabel: {
    color: tokenColor('bg'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: tokenWeight('weight-medium')
  }
});
