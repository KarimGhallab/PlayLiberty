import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { useApiConfig } from '../../src/auth/useApiConfig';
import PlaylistDetail from '../../src/views/playlist/PlaylistDetail/PlaylistDetail';

export default function PlaylistRoute() {
  const { playlistId, track } = useLocalSearchParams<{
    playlistId: string;
    track?: string;
  }>();
  const config = useApiConfig();
  const trackId = typeof track === 'string' && track.length > 0 ? track : null;
  const setAddress = useCallback(
    (next: string | null) => {
      if (next === trackId) {
        return;
      }

      router.setParams(next === null ? { track: undefined } : { track: next });
    },
    [trackId]
  );
  const openBareTrack = useCallback((next: string) => {
    router.replace({
      pathname: '/tracks/[trackId]',
      params: { trackId: next }
    });
  }, []);

  return (
    <PlaylistDetail
      config={config}
      playlistId={playlistId ?? null}
      trackId={trackId}
      onAddressChange={setAddress}
      onBareTrackRedirect={openBareTrack}
      onBack={() => {
        router.dismissTo('/');
      }}
    />
  );
}
