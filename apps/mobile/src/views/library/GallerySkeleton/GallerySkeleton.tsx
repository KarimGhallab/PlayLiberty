import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import { useAnnouncement } from '../../../shared/a11y/useAnnouncement';
import {
  tokenColor,
  tokenLength,
  touchTarget
} from '../../../shared/styles/tokens';

import { galleryColumnWidth } from '../galleryColumns/galleryColumns';

/* Six fills two rows at three columns and three at two. */
const ITEMS = 6;

/* The shape of the gallery rather than a sentence about waiting, so the read
 * resolves into the space this held and nothing moves when it lands. */
export default function GallerySkeleton() {
  const { t } = useI18n();
  const window = useWindowDimensions();
  const columnWidth = galleryColumnWidth(window.width);
  const label = t('library.loading');
  const liveRegion = useAnnouncement(label);

  return (
    <View
      testID="gallery-skeleton"
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion={liveRegion}
      style={styles.skeleton}>
      {/* The rail the gallery always draws at the head of its list, held so the
       * grid does not drop when the counts land. The pinned heading is not held:
       * a first read cannot know whether anything is pinned. */}
      <View
        testID="gallery-skeleton-rail"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.rail}>
        <View style={styles.railChip} />
        <View style={[styles.railChip, styles.railChipShort]} />
        <View style={styles.railChip} />
      </View>
      <View
        style={styles.grid}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {Array.from({ length: ITEMS }, (_, index) => (
          <View key={index} style={[styles.cell, { width: columnWidth }]}>
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
    flex: 1,
    gap: tokenLength('space-3')
  },
  rail: {
    height: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-2')
  },
  railChip: {
    height: touchTarget,
    width: tokenLength('space-9') * 2,
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  railChipShort: {
    width: tokenLength('space-9')
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokenLength('space-3')
  },
  cell: {
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
