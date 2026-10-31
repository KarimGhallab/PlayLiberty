import { StyleSheet, View } from 'react-native';

import { equalizerRests } from '@playliberty/ui-foundation';

import { tokenColor, tokenLength } from '../../styles/tokens';

const BAR_MAX = tokenLength('space-8');

/* The current row's decorative strip. The word carries the playback state, so
 * the bars never need to be announced or to move. */
export default function TrackBars() {
  return (
    <View
      testID="track-bars"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={styles.bars}>
      {equalizerRests.map((rest, index) => (
        <View
          key={`${index}:${rest}`}
          style={[styles.bar, { height: rest * BAR_MAX }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BAR_MAX,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: tokenLength('space-1'),
    paddingHorizontal: tokenLength('space-1')
  },
  bar: {
    width: 3,
    borderRadius: 1,
    backgroundColor: tokenColor('accent')
  }
});
