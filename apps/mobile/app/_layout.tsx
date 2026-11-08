import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';

import { useReduceMotion } from '../src/shared/a11y/useReduceMotion';
import { tokenColor } from '../src/shared/styles/tokens';

import plexSans from '../assets/fonts/IBMPlexSans-VariableFont_wdth,wght.ttf';
import type { AccessToken } from '../src/api/credentialed/credentialed';
import { streamAddress } from '../src/api/credentialed/credentialed';
import { useApiConfig } from '../src/auth/useApiConfig';
import LiveEvents from '../src/live/LiveEvents';
import PlayerAudio from '../src/player/PlayerAudio/PlayerAudio';
import PlayerBar from '../src/player/PlayerBar/PlayerBar';
import BackgroundPlayback from '../src/player/backgroundPlayback/BackgroundPlayback';
import { classifyStreamFailure } from '../src/player/streamFailure/streamFailure';
import AppProviders from '../src/providers/AppProviders';

/* The first frame has to carry the family the type scale was measured in, so
 * the splash waits for it. */
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ 'IBM Plex Sans': plexSans });
  const config = useApiConfig();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    /* A font that cannot load must not hold the app on the splash: the platform
     * face is the fallback. */
    if (fontsLoaded || fontError !== null) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const resolveSource = useCallback(
    (trackId: string, token: AccessToken | undefined = config?.token) =>
      config === null || token === undefined
        ? null
        : streamAddress({ baseUrl: config.baseUrl, token }, trackId),
    [config]
  );
  const classifyFailure = useCallback(
    (trackId: string) =>
      config === null
        ? Promise.resolve({ kind: 'unknown' as const })
        : classifyStreamFailure(config, trackId),
    [config]
  );

  /* The splash covers this frame, so the app never paints in the fallback. */
  if (!fontsLoaded && fontError === null) {
    return null;
  }

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
          contentStyle: { backgroundColor: tokenColor('bg') },
          animation: reduceMotion ? 'none' : 'default'
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="playlists/[playlistId]"
          options={{
            /* The route owns the sheet's one entry and exit, so the gallery
             * stays behind it; reduced motion cuts both. */
            presentation: 'transparentModal',
            animation: reduceMotion ? 'none' : 'slide_from_bottom',
            gestureEnabled: true,
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
