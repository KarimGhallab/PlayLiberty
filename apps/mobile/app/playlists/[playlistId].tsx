import { useLocalSearchParams } from 'expo-router';

import { useApiConfig } from '../../src/auth/useApiConfig';
import PlaylistDetail from '../../src/views/playlist/PlaylistDetail/PlaylistDetail';

export default function PlaylistRoute() {
  const { playlistId } = useLocalSearchParams<{ playlistId: string }>();
  const config = useApiConfig();

  return <PlaylistDetail config={config} playlistId={playlistId ?? null} />;
}
