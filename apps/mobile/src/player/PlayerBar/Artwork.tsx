import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { endpoints } from '@playliberty/contracts';

import AppImage from '../../shared/components/AppImage/AppImage';
import { tokenColor, tokenLength } from '../../shared/styles/tokens';

import { mediaAddress } from '../../api/credentialed/credentialed';
import type { ApiConfig } from '../../auth/useApiConfig';
import type { PlayerTrack } from '../playerTrack/playerTrack';

export interface ArtworkProps {
  readonly config: ApiConfig | null;
  readonly track: PlayerTrack;
  readonly size: number;
  readonly radius?: number;
}

/** The current track's sleeve. A new track tries its image again. */
function Artwork({
  config,
  track,
  size,
  radius = tokenLength('radius-artwork')
}: ArtworkProps) {
  const [failedId, setFailedId] = useState<string | null>(null);
  const imageFailed = failedId === track.id;
  const artwork =
    config === null || track.thumbnailPath === null || imageFailed
      ? null
      : mediaAddress(config, endpoints.trackThumbnail, { trackId: track.id });
  const box = { width: size, height: size, borderRadius: radius };
  const image =
    artwork === null ? (
      <View
        testID="player-bar-no-artwork"
        style={[styles.noArtwork, { borderRadius: radius }]}
      />
    ) : (
      <AppImage
        testID="player-bar-artwork"
        accessible={false}
        source={artwork}
        style={styles.image}
        onError={() => setFailedId(track.id)}
      />
    );

  return (
    <View testID="player-bar-art" style={[styles.art, box]}>
      {image}
    </View>
  );
}

export default memo(Artwork);

const styles = StyleSheet.create({
  art: {
    overflow: 'hidden',
    backgroundColor: tokenColor('surface-raised')
  },
  image: {
    width: '100%',
    height: '100%'
  },
  noArtwork: {
    flex: 1
  }
});
