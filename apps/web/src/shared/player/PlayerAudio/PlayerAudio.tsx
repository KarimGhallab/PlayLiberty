import { useEffect, useRef } from 'react';

import { endpoints } from '@playliberty/contracts';

import { mediaUrl } from '../../api/endpoints/endpoints';
import { TOUCH_QUERY, useMediaQuery } from '../../useMediaQuery/useMediaQuery';
import {
  bindSessionHandlers,
  publishMetadata
} from '../mediaSession/mediaSession';
import { shouldApplySeek, usePlayerStore } from '../playerStore/playerStore';
import {
  StreamFailureKind,
  classifyStreamFailure
} from '../streamFailure/streamFailure';
import { SeekDirection, currentTrack } from '../types';

/*
 * The one audio element, in the shell so playback survives a route change, and
 * the only component that touches it. Exactly one track is reachable at a time:
 * a new id replaces the source, nothing is prefetched.
 */

export default function PlayerAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentId = usePlayerStore(state => state.currentId);
  const current = usePlayerStore(currentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const positionSeconds = usePlayerStore(state => state.positionSeconds);
  const seekTo = usePlayerStore(state => state.seekTo);
  const volume = usePlayerStore(state => state.volume);
  const muted = usePlayerStore(state => state.muted);
  const touch = useMediaQuery(TOUCH_QUERY);
  const setPosition = usePlayerStore(state => state.setPosition);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const consumeSeek = usePlayerStore(state => state.consumeSeek);
  const advance = usePlayerStore(state => state.advance);
  const dropAndAdvance = usePlayerStore(state => state.dropAndAdvance);

  /*
   * Classify a load failure before anything moves: only a definitive answer
   * drops the entry, and `failedId` guards a probe that resolves after a move.
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

  /* Read through the store so the element's handlers stay off a stale closure
   * when the queue changes under them. */
  const skipNext = usePlayerStore(state => state.skipNext);
  const skipPrevious = usePlayerStore(state => state.skipPrevious);
  const seekByPage = usePlayerStore(state => state.seekByPage);

  /*
   * A ref, not state: `positionSeconds` is written on every `timeupdate`, so
   * the resume target is the value held when the track was reached.
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

    audio.src = mediaUrl(endpoints.trackStream, { trackId: currentId });
    audio.load();
  }, [currentId]);

  /*
   * The resume seek waits for metadata: `currentTime` set before the browser
   * knows the duration is silently dropped, and the track starts at zero.
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

    /* A touch device has no level surface and honours the OS one, so a level
     * persisted on a desktop must not arrive there as a quiet it cannot undo. */
    audio.muted = touch ? false : muted;
    audio.volume = touch ? 1 : volume;
  }, [volume, muted, touch]);

  /*
   * A seek request applies once: the store hands it over and clears it, so an
   * immediate jump is told from the element reporting its own progress.
   */
  useEffect(() => {
    const audio = audioRef.current;

    if (audio === null || seekTo === null) {
      return;
    }

    const target = consumeSeek();

    if (target === null) {
      return;
    }

    if (shouldApplySeek(audio.currentTime, target)) {
      audio.currentTime = target;
    }
  }, [seekTo, consumeSeek]);

  /*
   * `load()` leaves the element paused, so a skip while playing must start the
   * new source in the same commit: hence `currentId` here, source effect first.
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

  /* Re-publish metadata whenever the track changes, so it never describes a
   * track that is gone. */
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
                mediaUrl(endpoints.trackThumbnail, { trackId: current.id }),
                window.location.origin
              ).href
            }
          ];

    publishMetadata({
      title: current.title,
      artist: '',
      album: current.playlistName ?? '',
      artwork
    });
  }, [current]);

  /* The handlers read the store at press time, so they bind once instead of
   * rebinding as the position moves. */
  useEffect(
    () =>
      bindSessionHandlers({
        onPlay: () => setPlaying(true),
        onPause: () => setPlaying(false),
        onNextTrack: () => skipNext(),
        onPreviousTrack: () => skipPrevious(),
        onSeekBackward: () => seekByPage(SeekDirection.Backward),
        onSeekForward: () => seekByPage(SeekDirection.Forward)
      }),
    [setPlaying, skipNext, skipPrevious, seekByPage]
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
