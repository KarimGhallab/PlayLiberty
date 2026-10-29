import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';

import { tokenColor } from '../src/shared/styles/tokens';

import { streamSource } from '../src/api/streamSource';
import { useApiConfig } from '../src/auth/useApiConfig';
import { usePlayerAudio } from '../src/player/usePlayerAudio';
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

  usePlayerAudio(resolveSource);

  return (
    <AppProviders>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokenColor('bg') }
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="playlists/[playlistId]" />
        <Stack.Screen name="tracks/[trackId]" />
        <Stack.Screen name="egress" />
      </Stack>
    </AppProviders>
  );
}
