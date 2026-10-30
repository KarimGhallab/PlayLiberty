import { Image, StyleSheet, View } from 'react-native';

import shelfSonic from '../../../../assets/shelf/shelf-sonic.jpg';
import shelfYugioh from '../../../../assets/shelf/shelf-yugioh.jpg';
import shelfZelda from '../../../../assets/shelf/shelf-zelda.jpg';
import { tokenColor, tokenLength } from '../../styles/tokens';
import EqualizerBars from './EqualizerBars';

/* Placeholder covers for the door. Replace them with licensed or instance-owned
 * art before a public release. */
const ART = {
  left: shelfYugioh,
  right: shelfSonic,
  front: shelfZelda
};

const SLEEVE = tokenLength('space-9') * 2 + tokenLength('space-6');

export interface ShelfSleevesProps {
  readonly busy: boolean;
}

/** The door's shelf: three sleeves fanned, the front one carrying the mark. */
export default function ShelfSleeves({ busy }: ShelfSleevesProps) {
  return (
    <View style={styles.fan}>
      <View style={[styles.sleeve, styles.backLeft]}>
        <Image source={ART.left} style={styles.art} />
      </View>
      <View style={[styles.sleeve, styles.backRight]}>
        <Image source={ART.right} style={styles.art} />
      </View>
      <View style={[styles.sleeve, styles.front]}>
        <Image source={ART.front} style={styles.art} />
        <View style={styles.strip}>
          <View style={[StyleSheet.absoluteFill, styles.scrim]} />
          <EqualizerBars busy={busy} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fan: {
    width: SLEEVE + tokenLength('space-8'),
    height: SLEEVE + tokenLength('space-5'),
    marginBottom: tokenLength('space-2')
  },
  sleeve: {
    position: 'absolute',
    width: SLEEVE,
    height: SLEEVE,
    overflow: 'hidden',
    borderRadius: tokenLength('radius-artwork'),
    backgroundColor: tokenColor('surface')
  },
  backLeft: {
    left: 0,
    top: tokenLength('space-3'),
    transform: [{ rotate: '-8deg' }]
  },
  backRight: {
    right: 0,
    top: tokenLength('space-3'),
    transform: [{ rotate: '8deg' }]
  },
  front: {
    left: tokenLength('space-5'),
    top: 0
  },
  art: {
    width: '100%',
    height: '100%'
  },
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingVertical: tokenLength('space-2'),
    overflow: 'hidden'
  },
  scrim: {
    backgroundColor: tokenColor('bg'),
    opacity: 0.6
  }
});
