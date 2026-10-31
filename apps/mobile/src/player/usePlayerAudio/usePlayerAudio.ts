import {
  type AudioSource,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus
} from 'expo-audio';
import { useEffect, useRef } from 'react';

import { useSessionStore } from '../../auth/sessionStore/sessionStore';
import { usePlayerStore } from '../playerStore/playerStore';
import {
  type StreamFailureClassifier,
  StreamFailureKind
} from '../streamFailure/streamFailure';

export type SourceResolver = (trackId: string) => AudioSource | null;

/* One player for one queue. The address is derived only when a track is
 * reached, so a revoked share or a changed edge applies to the next track.
 * The OS's controls and notification are spec 24's; this hook sets the mode
 * that makes them possible and keeps the native source in step with the store. */

export function usePlayerAudio(
  resolveSource: SourceResolver,
  classifyFailure: StreamFailureClassifier
): void {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const currentId = usePlayerStore(state => state.currentId);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const advance = usePlayerStore(state => state.advance);
  const setPosition = usePlayerStore(state => state.setPosition);
  const seekTo = usePlayerStore(state => state.seekTo);
  const consumeSeek = usePlayerStore(state => state.consumeSeek);
  const loadedId = useRef<string | null>(null);
  const finished = useRef(false);
  const healthyId = useRef<string | null>(null);
  const classified = useRef<{ id: string; error: string } | null>(null);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix'
    });
  }, []);

  useEffect(() => {
    // A new resolver means a new credential or edge; the current track reloads.
    loadedId.current = null;
  }, [resolveSource]);

  useEffect(() => {
    if (currentId === null) {
      if (loadedId.current !== null) {
        player.pause();
        loadedId.current = null;
      }

      return;
    }

    if (loadedId.current === currentId) {
      return;
    }

    const source = resolveSource(currentId);

    loadedId.current = currentId;

    if (source === null) {
      player.pause();
      return;
    }

    player.replace(source);
  }, [currentId, player, resolveSource]);

  /* A seek applies once: the store hands it over and clears it, so the player
   * reporting its own progress is not read as another request. */
  useEffect(() => {
    if (seekTo === null) {
      return;
    }

    const target = consumeSeek();

    if (target !== null) {
      void player.seekTo(target).catch(() => undefined);
    }
  }, [consumeSeek, player, seekTo]);

  useEffect(() => {
    if (currentId === null) {
      return;
    }

    if (isPlaying) {
      player.play();
      return;
    }

    player.pause();
  }, [currentId, isPlaying, player]);

  /* The status is the player's own; a position from the previous source must
   * not be read as the new track's, so only a time change reports. */
  useEffect(() => {
    if (usePlayerStore.getState().currentId === null) {
      return;
    }

    setPosition(status.currentTime);
  }, [setPosition, status.currentTime]);

  /* Only an error from a source that had loaded is this track's failure; a
   * stale error from the previous source is not read onto the new track. */
  useEffect(() => {
    if (status.error === null) {
      healthyId.current = currentId;
      classified.current = null;
    }
  }, [currentId, status.error]);

  useEffect(() => {
    if (status.error === null || currentId === null) {
      return;
    }

    if (healthyId.current !== currentId) {
      return;
    }

    if (
      classified.current?.id === currentId &&
      classified.current.error === status.error
    ) {
      return;
    }

    const failedId = currentId;

    classified.current = { id: failedId, error: status.error };

    void classifyFailure(failedId).then(kind => {
      if (usePlayerStore.getState().currentId !== failedId) {
        return;
      }

      if (kind === StreamFailureKind.Session) {
        usePlayerStore.getState().clear();
        void useSessionStore.getState().expire();
        return;
      }

      if (kind === StreamFailureKind.Gone) {
        usePlayerStore.getState().drop(failedId);
        return;
      }

      usePlayerStore.getState().failPlayback(failedId);
    });
  }, [classifyFailure, currentId, status.error]);

  /* The status pulses once per ended track; the guard keeps a late pulse from
   * advancing again after the next track has already loaded. */
  useEffect(() => {
    if (!status.didJustFinish) {
      finished.current = false;
      return;
    }

    if (finished.current || currentId === null) {
      return;
    }

    finished.current = true;
    advance();
  }, [advance, currentId, status.didJustFinish]);
}
