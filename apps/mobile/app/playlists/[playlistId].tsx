import { useLocalSearchParams } from 'expo-router';

import Screen from '../../src/shared/components/Screen/Screen';

export default function PlaylistRoute() {
  const { playlistId } = useLocalSearchParams<{ playlistId: string }>();

  return <Screen testID="playlist-screen" title={playlistId ?? ''} />;
}
