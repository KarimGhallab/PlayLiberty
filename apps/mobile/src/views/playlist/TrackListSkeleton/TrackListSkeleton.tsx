import { StyleSheet, View } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import { useAnnouncement } from '../../../shared/a11y/useAnnouncement';
import { tokenColor, tokenLength } from '../../../shared/styles/tokens';

const ROWS = 8;

/* The row's geometry held open while the read lands, so the list resolves into
 * the space it already occupied. The placeholders are silent; the label is the
 * one announcement. */
export default function TrackListSkeleton() {
  const { t } = useI18n();
  const label = t('detail.loadingTracks');
  const liveRegion = useAnnouncement(label);

  return (
    <View
      testID="playlist-skeleton"
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion={liveRegion}
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
    width: tokenLength('space-9'),
    height: tokenLength('space-9'),
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
