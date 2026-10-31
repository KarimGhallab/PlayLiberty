import { StyleSheet, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import { tokenColor, tokenLength } from '../../../shared/styles/tokens';

const ROWS = 8;

/* The row's geometry held open while the read lands, so the list resolves into
 * the space it already occupied. The placeholders are silent; the label is the
 * one announcement. */
export default function TrackListSkeleton() {
  const { t } = useI18n();

  return (
    <View
      testID="playlist-skeleton"
      accessible
      accessibilityLabel={t('detail.loadingTracks')}
      accessibilityLiveRegion="polite"
      style={styles.skeleton}>
      <View
        style={styles.list}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {Array.from({ length: ROWS }, (_, index) => (
          <View key={index} style={styles.row}>
            <View style={styles.art} />
            <View style={styles.body}>
              <View style={styles.title} />
              <View style={styles.meta} />
            </View>
            <View style={styles.duration} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    gap: tokenLength('space-3')
  },
  list: {
    gap: tokenLength('space-3')
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3'),
    paddingVertical: tokenLength('space-2')
  },
  art: {
    width: 48,
    height: 48,
    borderRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface-raised')
  },
  body: {
    flex: 1,
    gap: tokenLength('space-2')
  },
  title: {
    height: tokenLength('space-3'),
    width: '70%',
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  meta: {
    height: tokenLength('space-3'),
    width: '40%',
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  duration: {
    height: tokenLength('space-3'),
    width: tokenLength('space-7'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  }
});
