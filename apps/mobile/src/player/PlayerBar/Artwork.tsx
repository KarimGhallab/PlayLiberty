import { router } from 'expo-router';
import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { endpoints } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import { mediaSource } from '../../shared/media/mediaSource';
import { tokenColor, tokenLength } from '../../shared/styles/tokens';

import type { ApiConfig } from '../../auth/useApiConfig';
import type { PlayerTrack } from '../playerTrack/playerTrack';

export interface ArtworkProps {
  readonly config: ApiConfig | null;
  readonly track: PlayerTrack;
  readonly playlistId: string | null;
  readonly playlistName: string | null;
  readonly size: number;
  readonly radius?: number;
}

/** The current track's sleeve, and the way back to its playlist when the
 * queue has one. A new track tries its image again. */
function Artwork({
  config,
  track,
  playlistId,
  playlistName,
  size,
  radius = tokenLength('radius-artwork')
}: ArtworkProps) {
  const { t } = useI18n();
  const [failedId, setFailedId] = useState<string | null>(null);
  const imageFailed = failedId === track.id;
  const artwork =
    config === null || track.thumbnailPath === null || imageFailed
      ? null
      : mediaSource(config, endpoints.trackThumbnail, { trackId: track.id });
  const box = { width: size, height: size, borderRadius: radius };

  const image =
    artwork === null ? (
      <View
        testID="player-bar-no-artwork"
        style={[styles.noArtwork, { borderRadius: radius }]}
      />
    ) : (
      <Image
        testID="player-bar-artwork"
        accessible={false}
        source={artwork}
        style={styles.image}
        onError={() => setFailedId(track.id)}
      />
    );

  if (playlistId === null) {
    return (
      <View testID="player-bar-art" style={[styles.art, box]}>
        {image}
      </View>
    );
  }

  return (
    <Pressable
      testID="player-open-playlist"
      accessibilityRole="button"
      accessibilityLabel={t('playerBar.openPlaylist', {
        name: playlistName ?? ''
      })}
      style={[styles.art, box]}
      onPress={() =>
        router.navigate({
          pathname: '/playlists/[playlistId]',
          params: { playlistId }
        })
      }>
      {image}
    </Pressable>
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
