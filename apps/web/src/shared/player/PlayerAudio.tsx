import { useEffect, useRef } from 'react';

import { API_PREFIX } from '../api/client';
import { usePlayerStore } from './playerStore';

/*
 * The one global audio element. It lives in the shell so playback survives a
 * route change, and it is the only component that touches the element or the
 * Media Session. Every Media Session call is feature-detected and guarded,
 * because the API is absent in some engines and throws when a handler is not
 * supported.
 */
export default function PlayerAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentId = usePlayerStore(state => state.currentId);
  const currentTitle = usePlayerStore(
    state =>
      state.queue.find(track => track.id === state.currentId)?.title ?? null
  );
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const setPosition = usePlayerStore(state => state.setPosition);
  const setPlaying = usePlayerStore(state => state.setPlaying);

  useEffect(() => {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    if (currentId === null) {
      audio.removeAttribute('src');
      audio.load();
      return;
    }

    audio.src = `${API_PREFIX}/tracks/${currentId}/stream`;
    audio.load();
  }, [currentId]);

  useEffect(() => {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    if (isPlaying) {
      audio.play().catch(() => setPlaying(false));
      return;
    }

    audio.pause();
  }, [isPlaying, setPlaying]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    try {
      const { mediaSession } = navigator;

      if (currentTitle === null || typeof MediaMetadata === 'undefined') {
        mediaSession.metadata = null;
        return;
      }

      mediaSession.metadata = new MediaMetadata({ title: currentTitle });
    } catch {
      // Metadata is a nicety; playback does not depend on it.
    }
  }, [currentTitle]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    try {
      const { mediaSession } = navigator;

      mediaSession.setActionHandler('play', () => setPlaying(true));
      mediaSession.setActionHandler('pause', () => setPlaying(false));

      return () => {
        mediaSession.setActionHandler('play', null);
        mediaSession.setActionHandler('pause', null);
      };
    } catch {
      return undefined;
    }
  }, [setPlaying]);

  return (
    <audio
      ref={audioRef}
      hidden
      onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
      onEnded={() => setPlaying(false)}
    />
  );
}
