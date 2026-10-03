import { useEffect, useRef } from 'react';

import { API_PREFIX } from '../api/client';
import { bindSessionHandlers, publishMetadata } from './mediaSession';
import { usePlayerStore } from './playerStore';
import { StreamFailureKind, classifyStreamFailure } from './streamFailure';

/*
 * The one global audio element. It lives in the shell so playback survives a
 * route change, and it is the only component that touches the element.
 *
 * Exactly one track is reachable at a time: the source is derived from the
 * current id, and a new id replaces the source rather than adding one. Nothing
 * is prefetched, because the element is given a source only when a track is
 * reached and the browser fetches it then.
 */

/** How far the element may drift from the store before the store is the truth. */
const SEEK_EPSILON = 0.5;

export default function PlayerAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentId = usePlayerStore(state => state.currentId);
  const currentTitle = usePlayerStore(
    state =>
      state.queue.find(track => track.id === state.currentId)?.title ?? null
  );
  const currentThumbnail = usePlayerStore(
    state =>
      state.queue.find(track => track.id === state.currentId)?.thumbnailPath ??
      null
  );
  const currentPlaylistName = usePlayerStore(
    state =>
      state.queue.find(track => track.id === state.currentId)?.playlistName ??
      null
  );
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const positionSeconds = usePlayerStore(state => state.positionSeconds);
  const seekTo = usePlayerStore(state => state.seekTo);
  const volume = usePlayerStore(state => state.volume);
  const setPosition = usePlayerStore(state => state.setPosition);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const clearSeek = usePlayerStore(state => state.clearSeek);
  const advance = usePlayerStore(state => state.advance);
  const dropAndAdvance = usePlayerStore(state => state.dropAndAdvance);

  /*
   * A load failure is classified before anything moves. The element cannot say
   * whether it failed because the track is gone or because the session expired,
   * so the route is asked for its status; only a definitive answer removes the
   * entry, and an unknown failure leaves it in place and stops. `failedId` is
   * captured so a probe that resolves after the listener moved on does not touch
   * the track they are on now.
   */
  const handleError = (): void => {
    if (currentId === null) {
      return;
    }

    const failedId = currentId;

    void classifyStreamFailure(failedId).then(kind => {
      if (kind === StreamFailureKind.Session) {
        return;
      }

      if (usePlayerStore.getState().currentId !== failedId) {
        return;
      }

      if (kind === StreamFailureKind.Gone) {
        dropAndAdvance(failedId);
        return;
      }

      setPlaying(false);
    });
  };

  /*
   * `advance` and `publishMetadata` are stable store setters and module
   * functions, but reading them through the store keeps the element's handlers
   * off a stale closure when the queue changes under it.
   */
  const skipNext = usePlayerStore(state => state.skipNext);
  const skipPrevious = usePlayerStore(state => state.skipPrevious);
  const seek = usePlayerStore(state => state.seek);

  /*
   * A ref, not state, is the resume target. The store's `positionSeconds` is
   * written by the element on every `timeupdate`, so applying it whenever it
   * changed would fight the element's own progress; the value a track should
   * start at is whatever the store held when the track was reached, which is a
   * fact about that moment and not about the current render.
   */
  const resumeAtRef = useRef(positionSeconds);
  const lastIdRef = useRef(currentId);

  useEffect(() => {
    if (lastIdRef.current !== currentId) {
      lastIdRef.current = currentId;
      resumeAtRef.current = positionSeconds;
    }
  }, [currentId, positionSeconds]);

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

  /*
   * The resume seek has to wait for metadata, because `currentTime` cannot be
   * set before the browser knows how long the file is: setting it earlier is
   * silently dropped and the track starts at zero.
   */
  useEffect(() => {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    const element = audio;
    const applyResume = (): void => {
      const target = resumeAtRef.current;

      if (target <= 0) {
        return;
      }

      element.currentTime = target;
      resumeAtRef.current = 0;
    };

    element.addEventListener('loadedmetadata', applyResume);

    return () => {
      element.removeEventListener('loadedmetadata', applyResume);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

  /*
   * A seek request is applied once and cleared, which is how an immediate jump
   * is told apart from the element reporting its own progress. `seekTo` is null
   * on every render but the one a seek produced.
   */
  useEffect(() => {
    const audio = audioRef.current;

    if (audio === null || seekTo === null) {
      return;
    }

    if (Math.abs(audio.currentTime - seekTo) > SEEK_EPSILON) {
      audio.currentTime = seekTo;
    }

    clearSeek();
  }, [seekTo, clearSeek]);

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

  /*
   * The controls in both directions: metadata and the handlers are re-published
   * whenever the track changes, so they never describe a track that is gone.
   */
  useEffect(() => {
    if (currentTitle === null || currentId === null) {
      publishMetadata(null);
      return;
    }

    const artwork =
      currentThumbnail === null
        ? []
        : [
            {
              src: new URL(
                `${API_PREFIX}/tracks/${currentId}/thumbnail`,
                window.location.origin
              ).href
            }
          ];

    publishMetadata({
      title: currentTitle,
      artist: '',
      album: currentPlaylistName ?? 'PlayLiberty',
      artwork
    });
  }, [currentTitle, currentThumbnail, currentId, currentPlaylistName]);

  useEffect(
    () =>
      bindSessionHandlers({
        onPlay: () => setPlaying(true),
        onPause: () => setPlaying(false),
        onNextTrack: () => skipNext(),
        onPreviousTrack: () => skipPrevious(),
        onSeekBackward: () => seek(Math.max(0, positionSeconds - 10)),
        onSeekForward: () => seek(positionSeconds + 10)
      }),
    [setPlaying, skipNext, skipPrevious, seek, positionSeconds]
  );

  return (
    <audio
      ref={audioRef}
      hidden
      onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
      onEnded={() => advance()}
      onError={() => handleError()}
    />
  );
}
