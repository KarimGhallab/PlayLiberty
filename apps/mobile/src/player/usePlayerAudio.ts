import {
  type AudioSource,
  setAudioModeAsync,
  useAudioPlaylist
} from 'expo-audio';
import { useEffect } from 'react';

import { usePlayerStore } from './playerStore/playerStore';

export type SourceResolver = (trackId: string) => AudioSource | null;

/* One playlist for one queue. The OS's controls and notification are spec 24's;
 * this hook sets the mode that makes them possible and keeps the native queue in
 * step with the store. */

export function usePlayerAudio(resolveSource: SourceResolver): void {
  const playlist = useAudioPlaylist({ loop: 'none' });
  const queue = usePlayerStore(state => state.queue);
  const playlistId = usePlayerStore(state => state.playlistId);
  const currentId = usePlayerStore(state => state.currentId);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix'
    });
  }, []);

  useEffect(() => {
    if (playlistId === null) {
      return;
    }

    for (let index = playlist.trackCount - 1; index >= 0; index -= 1) {
      playlist.remove(index);
    }

    for (const trackId of queue) {
      const source = resolveSource(trackId);

      if (source !== null) {
        playlist.add(source);
      }
    }

    const currentIndex = currentId === null ? -1 : queue.indexOf(currentId);

    if (currentIndex >= 0) {
      playlist.skipTo(currentIndex);
    }
  }, [currentId, playlist, playlistId, queue, resolveSource]);
}
