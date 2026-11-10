import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@playliberty/i18n';

import { useAnnouncement } from '../../shared/a11y/useAnnouncement/useAnnouncement';
import {
  tokenColor,
  tokenLength,
  tokenNumber
} from '../../shared/styles/tokens/tokens';

import { playerBarHeight } from '../../player/playerBarSize/playerBarSize';

/* The player bar's slot, held while the track read lands, so the page does not
 * gain a bar out of nowhere. */
export default function BareTrackLoading() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const label = t('trackLink.loading');
  const liveRegion = useAnnouncement(label);

  return (
    <View
      testID="bare-track-loading"
      accessible
      pointerEvents="none"
      accessibilityLabel={label}
      accessibilityLiveRegion={liveRegion}
      style={[
        styles.deck,
        {
          bottom: insets.bottom + tokenLength('space-1'),
          height: playerBarHeight - 6
        }
      ]}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.capsule}>
        <View style={styles.top}>
          <View style={styles.artwork} />
          <View style={styles.lines}>
            <View style={styles.title} />
            <View style={styles.meta} />
          </View>
        </View>
        <View style={styles.rail} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: tokenNumber('z-player')
  },
  capsule: {
    position: 'absolute',
    left: tokenLength('space-2'),
    right: tokenLength('space-2'),
    bottom: 0,
    minHeight: playerBarHeight - 6,
    justifyContent: 'center',
    gap: tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-3'),
    paddingVertical: tokenLength('space-2'),
    borderWidth: 1,
    borderColor: tokenColor('line'),
    borderRadius: tokenLength('space-3'),
    backgroundColor: tokenColor('surface')
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenLength('space-3')
  },
  artwork: {
    width: tokenLength('space-9') - tokenLength('space-1'),
    height: tokenLength('space-9') - tokenLength('space-1'),
    borderRadius: tokenLength('space-2'),
    backgroundColor: tokenColor('surface-raised')
  },
  lines: {
    flex: 1,
    gap: tokenLength('space-1')
  },
  title: {
    width: '70%',
    height: tokenLength('text-md'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  meta: {
    width: '45%',
    height: tokenLength('text-xs'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  },
  rail: {
    height: tokenLength('space-1'),
    borderRadius: tokenLength('radius-chip'),
    backgroundColor: tokenColor('surface-raised')
  }
});
