import { useEffect, useRef } from 'react';

import { API_PREFIX } from '../../api/client/client';
import {
  bindSessionHandlers,
  publishMetadata
} from '../mediaSession/mediaSession';
import { usePlayerStore } from '../playerStore/playerStore';
import {
  StreamFailureKind,
  classifyStreamFailure
} from '../streamFailure/streamFailure';
import { currentTrack } from '../types';

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
  const current = usePlayerStore(currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const positionSeconds = usePlayerStore(state => state.positionSeconds);
  const seekTo = usePlayerStore(state => state.seekTo);
  const volume = usePlayerStore(state => state.volume);
  const muted = usePlayerStore(state => state.muted);
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

    audio.muted = muted;
    audio.volume = volume;
  }, [volume, muted]);

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

  /*
   * The element follows playback and the current track together. A track change
   * reloads the source, and `load()` leaves the element paused, so a skip while
   * playing has to start the new source in the same commit or the bar shows pause
   * over silence. `currentId` is therefore a dependency and not only the source
   * effect's: the two effects run in order, the source first, and this one plays
   * what the source just loaded.
   */
  useEffect(() => {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    if (isPlaying) {
      const startedId = currentId;
      audio.play().catch(() => {
        if (usePlayerStore.getState().currentId === startedId) {
          setPlaying(false);
        }
      });
      return;
    }

    audio.pause();
  }, [isPlaying, currentId, setPlaying]);

  /*
   * The controls in both directions: metadata and the handlers are re-published
   * whenever the track changes, so they never describe a track that is gone.
   */
  useEffect(() => {
    if (current === null) {
      publishMetadata(null);
      return;
    }

    const artwork =
      current.thumbnailPath === null
        ? []
        : [
            {
              src: new URL(
                `${API_PREFIX}/tracks/${current.id}/thumbnail`,
                window.location.origin
              ).href
            }
          ];

    publishMetadata({
      title: current.title,
      artist: '',
      album: current.playlistName,
      artwork
    });
  }, [current]);

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
