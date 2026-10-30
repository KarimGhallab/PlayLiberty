import { StyleSheet, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import { tokenColor, tokenLength } from '../../../shared/styles/tokens';

/* Six fills the first screen at two columns and three rows. */
const ITEMS = 6;

/* The shape of the gallery rather than a sentence about waiting, so the read
 * resolves into the space this held and nothing moves when it lands. */
export default function GallerySkeleton() {
  const { t } = useI18n();

  return (
    <View
      testID="gallery-skeleton"
      accessible
      accessibilityLabel={t('library.loading')}
      accessibilityLiveRegion="polite"
      style={styles.skeleton}>
      <View
        style={styles.grid}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {Array.from({ length: ITEMS }, (_, index) => (
          <View key={index} style={styles.cell}>
            <View style={styles.picture} />
            <View style={styles.line} />
            <View style={styles.shortLine} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    flex: 1
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokenLength('space-3')
  },
  cell: {
    width: '48%',
    gap: tokenLength('space-2')
  },
  picture: {
    aspectRatio: 1,
    borderRadius: tokenLength('radius-card'),
    backgroundColor: tokenColor('surface-raised')
  },
  line: {
    height: tokenLength('space-3'),
    width: '80%',
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  shortLine: {
    height: tokenLength('space-3'),
    width: '50%',
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  }
});
