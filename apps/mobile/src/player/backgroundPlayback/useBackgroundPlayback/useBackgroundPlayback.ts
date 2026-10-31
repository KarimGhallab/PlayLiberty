import { requestNotificationPermissionsAsync } from 'expo-audio';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';

import { useI18n } from '@playliberty/i18n';

import type { ApiConfig } from '../../../auth/useApiConfig';
import { usePlayerStore } from '../../playerStore/playerStore';
import { backgroundPlayback } from '../backgroundPlayback';
import {
  type BackgroundPlaybackLabels,
  backgroundPlaybackState
} from '../backgroundPlaybackState/backgroundPlaybackState';

/*
 * The bridge between the player store and the Android media service. The app
 * starts the service from a user press and then mirrors one state object into
 * it; commands come back into the same store actions the bar uses.
 */
export function useBackgroundPlayback(config: ApiConfig | null): void {
  const { t } = useI18n();
  const currentId = usePlayerStore(state => state.currentId);
  const queue = usePlayerStore(state => state.queue);
  const track = usePlayerStore(state =>
    state.currentId === null ? undefined : state.tracks[state.currentId]
  );
  const playlistId = usePlayerStore(state => state.playlistId);
  const playlistName = usePlayerStore(state => state.playlistName);
  const coverUpdatedAt = usePlayerStore(state => state.playlistCoverUpdatedAt);
  const coverTrackId = usePlayerStore(state => state.playlistCoverTrackId);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const positionSeconds = usePlayerStore(state => state.positionSeconds);
  const showBackgroundNotice = usePlayerStore(
    state => state.showBackgroundNotice
  );
  const started = useRef(false);
  const permissionAsked = useRef(false);
  const permissionGranted = useRef(false);
  const refusalNoticed = useRef(false);

  const labels = useMemo<BackgroundPlaybackLabels>(
    () => ({
      play: t('playerBar.play'),
      pause: t('playerBar.pause'),
      previous: t('playerBar.previous'),
      next: t('playerBar.next'),
      channel: t('playerBar.label')
    }),
    [t]
  );

  const canNext =
    currentId !== null &&
    queue.indexOf(currentId) >= 0 &&
    queue[queue.indexOf(currentId) + 1] !== undefined;
  const roundedPosition = Math.floor(positionSeconds);
  const state = useMemo(
    () =>
      track === undefined
        ? null
        : backgroundPlaybackState({
            track,
            playlistId,
            playlistName,
            coverUpdatedAt,
            coverTrackId,
            isPlaying,
            positionSeconds: roundedPosition,
            canPrevious: true,
            canNext,
            config,
            labels
          }),
    [
      canNext,
      config,
      coverTrackId,
      coverUpdatedAt,
      isPlaying,
      labels,
      playlistId,
      playlistName,
      roundedPosition,
      track
    ]
  );
  const latest = useRef(state);
  latest.current = state;

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    if (permissionAsked.current) {
      return permissionGranted.current;
    }

    permissionAsked.current = true;
    const result = await requestNotificationPermissionsAsync().catch(
      () => null
    );

    permissionGranted.current = result?.granted ?? false;

    return permissionGranted.current;
  }, []);

  useEffect(() => {
    if (backgroundPlayback === null) {
      return;
    }

    if (state === null) {
      if (started.current) {
        backgroundPlayback.stop();
        started.current = false;
      }

      return;
    }

    if (started.current) {
      backgroundPlayback.update(state);
      return;
    }

    let active = true;

    started.current = true;

    void (async () => {
      const granted = await ensurePermission();

      if (!active) {
        return;
      }

      if (latest.current === null) {
        backgroundPlayback.stop();
        started.current = false;
        return;
      }

      await backgroundPlayback.start(latest.current);

      if (latest.current !== null) {
        backgroundPlayback.update(latest.current);
      }

      if (!granted && !refusalNoticed.current) {
        refusalNoticed.current = true;
        showBackgroundNotice();
      }
    })();

    return () => {
      active = false;
    };
  }, [ensurePermission, showBackgroundNotice, state]);

  useEffect(() => {
    if (backgroundPlayback === null) {
      return;
    }

    const subscription = backgroundPlayback.addCommandListener(
      (command, position) => {
        const player = usePlayerStore.getState();

        if (command === 'toggle') {
          player.setPlaying(!player.isPlaying);
          return;
        }

        if (command === 'previous') {
          player.skipPrevious();
          return;
        }

        if (command === 'next') {
          player.skipNext();
          return;
        }

        if (command === 'seek') {
          const current =
            player.currentId === null
              ? undefined
              : player.tracks[player.currentId];
          const duration = current?.durationSeconds ?? null;

          if (position !== undefined && duration !== null && duration > 0) {
            player.seekToFraction(position / duration);
          }

          return;
        }

        player.setPlaying(command === 'play');
      }
    );

    return () => subscription.remove();
  }, []);
}
