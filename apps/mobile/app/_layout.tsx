import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';

import { tokenColor } from '../src/shared/styles/tokens';

import { streamSource } from '../src/api/streamSource';
import { useApiConfig } from '../src/auth/useApiConfig';
import LiveEvents from '../src/live/LiveEvents';
import PlayerAudio from '../src/player/PlayerAudio/PlayerAudio';
import PlayerBar from '../src/player/PlayerBar/PlayerBar';
import BackgroundPlayback from '../src/player/backgroundPlayback/BackgroundPlayback';
import {
  StreamFailureKind,
  classifyStreamFailure
} from '../src/player/streamFailure/streamFailure';
import AppProviders from '../src/providers/AppProviders';

export default function RootLayout() {
  const config = useApiConfig();
  const resolveSource = useCallback(
    (trackId: string) =>
      config === null
        ? null
        : streamSource(config.baseUrl, trackId, config.token),
    [config]
  );
  const classifyFailure = useCallback(
    (trackId: string) =>
      config === null
        ? Promise.resolve(StreamFailureKind.Unknown)
        : classifyStreamFailure(config, trackId),
    [config]
  );

  return (
    <AppProviders>
      <StatusBar style="light" />
      <LiveEvents config={config} />
      <BackgroundPlayback config={config} />
      <PlayerAudio
        resolveSource={resolveSource}
        classifyFailure={classifyFailure}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokenColor('bg') }
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="playlists/[playlistId]"
          options={{
            /* The detail rides as a sheet over the gallery, which stays visible
             * under the drag that returns to it. The screen owns its own
             * travel, so the stack's animation stays out of the way. */
            presentation: 'transparentModal',
            animation: 'none',
            gestureEnabled: false,
            contentStyle: { backgroundColor: 'transparent' }
          }}
        />
        <Stack.Screen name="tracks/[trackId]" />
        <Stack.Screen name="egress" />
        <Stack.Screen name="provision" />
        <Stack.Screen name="auth/callback" />
      </Stack>
      <PlayerBar config={config} />
    </AppProviders>
  );
}
