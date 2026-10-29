import { IconPlayerSkipBack, IconPlayerSkipForward } from '@tabler/icons-react';
import { Link, useMatchRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

import { endpoints } from '@playliberty/contracts';
import { formatDuration, useI18n } from '@playliberty/i18n';

import { mediaUrl } from '../../api/endpoints/endpoints';
import PlayGlyph from '../../components/PlayGlyph';
import { usePlayPauseMorph } from '../../components/usePlayPauseMorph/usePlayPauseMorph';
import { TOUCH_QUERY, useMediaQuery } from '../../useMediaQuery/useMediaQuery';
import VolumeControl from '../VolumeControl/VolumeControl';
import { usePlayerStore } from '../playerStore/playerStore';
import { ownsArrowKey, ownsGlobalKey } from '../transportKeys';
import { SeekDirection, currentTrack, hasNext } from '../types';
import styles from './PlayerBar.module.scss';

/*
 * The player bar: absent at rest; once playback exists it persists across both
 * routes, like the music. Its transport is always drawn, unlike the header's,
 * so a control never appears and disappears.
 */

/* Pointer capture keeps a drag alive when the pointer leaves the track. A host
 * without it (jsdom) must not throw, so the call is optional-chained. */
function capturePointer(element: HTMLElement, pointerId: number): void {
  element.setPointerCapture?.(pointerId);
}

function releasePointer(element: HTMLElement, pointerId: number): void {
  element.releasePointerCapture?.(pointerId);
}

export default function PlayerBar() {
  const { t } = useI18n();
  const current = usePlayerStore(currentTrack);
  const matchRoute = useMatchRoute();
  const onCurrentPlaylist =
    current !== null &&
    matchRoute({
      to: '/playlists/$playlistId',
      params: { playlistId: current.playlistId }
    }) !== false;
  const positionSeconds = usePlayerStore(state => state.positionSeconds);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const seekToFraction = usePlayerStore(state => state.seekToFraction);
  const seekBy = usePlayerStore(state => state.seekBy);
  const seekToStart = usePlayerStore(state => state.seekToStart);
  const seekToEnd = usePlayerStore(state => state.seekToEnd);
  const skipNext = usePlayerStore(state => state.skipNext);
  const skipPrevious = usePlayerStore(state => state.skipPrevious);
  const canSkipNext = usePlayerStore(hasNext);
  const touch = useMediaQuery(TOUCH_QUERY);
  const scrubRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  /* The dragged position stays local until release, so the element is asked to
   * play once, not once per pointer move. */
  const dragFractionRef = useRef<number | null>(null);
  const wasPlayingRef = useRef(false);
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  const { run, endRun } = usePlayPauseMorph(isPlaying);

  /* The keyboard transport, on the window so a press reaches it wherever focus
   * sits. Space is the transport's wherever it is not text entry or an open
   * modal surface; the arrows keep their control. The store is read at press. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const state = usePlayerStore.getState();

      if (state.currentId === null) {
        return;
      }

      if (event.key === ' ' && !event.repeat) {
        if (ownsGlobalKey(event)) {
          return;
        }

        event.preventDefault();
        state.setPlaying(!state.isPlaying);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        if (ownsArrowKey(event)) {
          return;
        }

        event.preventDefault();

        state.seekBy(
          event.key === 'ArrowRight'
            ? SeekDirection.Forward
            : SeekDirection.Backward
        );
        return;
      }

      /* Shift and a letter: no control activates on one, so only text entry and
       * an open menu or dialog keep it. The store's own actions carry the grace
       * window and the clamp, exactly as the bar's buttons do. */
      if (event.shiftKey) {
        const chord = event.key.toLowerCase();

        if (chord !== 'n' && chord !== 'p') {
          return;
        }

        if (ownsGlobalKey(event)) {
          return;
        }

        event.preventDefault();

        if (chord === 'n') {
          state.skipNext();
        } else {
          state.skipPrevious();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (current === null) {
    return null;
  }

  const duration = current.durationSeconds ?? 0;
  const elapsed = Math.min(positionSeconds, duration);
  const fraction = duration > 0 ? elapsed / duration : 0;
  /* While the pointer holds the track, the bar reports the target the release
   * will land on, not a position the element has not been given yet. */
  const shownFraction = dragFraction ?? fraction;
  const shownElapsed =
    dragFraction === null ? elapsed : dragFraction * duration;
  const artwork =
    current.thumbnailPath === null
      ? null
      : mediaUrl(endpoints.trackThumbnail, { trackId: current.id });

  /* The pointer's x as a fraction of the track's own box, bounded: the store
   * owns the fraction-to-seconds conversion. */
  const fractionAt = (clientX: number): number => {
    const box = scrubRef.current?.getBoundingClientRect();

    if (box === undefined || box.width === 0) {
      return 0;
    }

    return Math.min(1, Math.max(0, (clientX - box.left) / box.width));
  };

  /* The gesture holds the player still: the element stays paused until release,
   * so a drag is silent and the seek is one jump rather than one per move. */
  const startScrub = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const fraction = fractionAt(event.clientX);

    draggingRef.current = true;
    dragFractionRef.current = fraction;
    wasPlayingRef.current = usePlayerStore.getState().isPlaying;
    capturePointer(event.currentTarget, event.pointerId);
    setDragFraction(fraction);

    if (wasPlayingRef.current) {
      setPlaying(false);
    }
  };

  const moveScrub = (event: PointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) {
      return;
    }

    const fraction = fractionAt(event.clientX);

    dragFractionRef.current = fraction;
    setDragFraction(fraction);
  };

  const endScrub = (event: PointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) {
      return;
    }

    draggingRef.current = false;
    releasePointer(event.currentTarget, event.pointerId);

    const fraction = dragFractionRef.current;

    dragFractionRef.current = null;
    setDragFraction(null);

    if (fraction !== null) {
      seekToFraction(fraction);
    }

    /* Only a scrub that interrupted playback resumes it; a paused player stays
     * paused, where the gesture changed the position and nothing else. */
    if (wasPlayingRef.current) {
      setPlaying(true);
    }
  };

  return (
    <footer
      className={styles.playerBar}
      aria-label={t('playerBar.label')}
      data-state={isPlaying ? 'playing' : 'paused'}>
      <Link
        to="/playlists/$playlistId"
        params={{ playlistId: current.playlistId }}
        className={styles.playerBar__art}
        data-art={artwork === null ? 'no-art' : 'art'}
        aria-hidden="true"
        tabIndex={-1}
        disabled={onCurrentPlaylist}>
        {artwork === null ? null : (
          <img
            className={styles.playerBar__image}
            src={artwork}
            alt=""
            decoding="async"
          />
        )}
      </Link>
      <div className={styles.playerBar__top}>
        <div className={styles.playerBar__id}>
          <span className={styles.playerBar__name}>
            <span className={styles.playerBar__title}>{current.title}</span>
            <Link
              to="/playlists/$playlistId"
              params={{ playlistId: current.playlistId }}
              className={styles.playerBar__source}
              disabled={onCurrentPlaylist}>
              {current.playlistName}
            </Link>
          </span>
        </div>
        <div className={styles.playerBar__transport}>
          <span className={styles.playerBar__hint}>
            <button
              type="button"
              className={styles.playerBar__step}
              aria-label={t('playerBar.previous')}
              aria-keyshortcuts="Shift+P"
              onClick={() => skipPrevious()}>
              <IconPlayerSkipBack
                className={styles.playerBar__stepIcon}
                aria-hidden="true"
                focusable="false"
              />
            </button>
            <span className={styles.playerBar__tip} aria-hidden="true">
              <kbd className={styles.playerBar__key}>
                {t('playerBar.shortcutShift')}
              </kbd>
              +
              <kbd className={styles.playerBar__key}>
                {t('playerBar.shortcutPrevious')}
              </kbd>
            </span>
          </span>
          <button
            type="button"
            className={styles.playerBar__play}
            aria-label={isPlaying ? t('playerBar.pause') : t('playerBar.play')}
            aria-keyshortcuts="Space"
            data-run={run}
            onAnimationEnd={endRun}
            onClick={() => setPlaying(!isPlaying)}>
            <PlayGlyph
              className={styles.playerBar__glyph}
              stripClassName={styles.playerBar__strip}
            />
          </button>
          <span className={styles.playerBar__hint}>
            <button
              type="button"
              className={styles.playerBar__step}
              aria-label={t('playerBar.next')}
              aria-keyshortcuts="Shift+N"
              disabled={!canSkipNext}
              onClick={() => skipNext()}>
              <IconPlayerSkipForward
                className={styles.playerBar__stepIcon}
                aria-hidden="true"
                focusable="false"
              />
            </button>
            <span className={styles.playerBar__tip} aria-hidden="true">
              <kbd className={styles.playerBar__key}>
                {t('playerBar.shortcutShift')}
              </kbd>
              +
              <kbd className={styles.playerBar__key}>
                {t('playerBar.shortcutNext')}
              </kbd>
            </span>
          </span>
        </div>
      </div>
      <div className={styles.playerBar__position}>
        <span className={styles.playerBar__time}>
          {formatDuration(shownElapsed)}
        </span>
        <div
          ref={scrubRef}
          className={styles.playerBar__scrub}
          role="slider"
          tabIndex={0}
          aria-label={t('playerBar.position')}
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={shownElapsed}
          aria-valuetext={t('playerBar.positionValue', {
            elapsed: formatDuration(shownElapsed),
            duration: formatDuration(duration)
          })}
          data-dragging={dragFraction === null ? undefined : 'true'}
          onPointerDown={startScrub}
          onPointerMove={moveScrub}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
          onKeyDown={event => {
            if (
              (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.altKey
            ) {
              event.preventDefault();
              seekBy(
                event.key === 'ArrowRight'
                  ? SeekDirection.Forward
                  : SeekDirection.Backward
              );
              return;
            }

            if (event.key === 'Home') {
              seekToStart();
            }

            if (event.key === 'End') {
              seekToEnd();
            }
          }}>
          <div
            className={styles.playerBar__fill}
            style={{ transform: `scaleX(${shownFraction})` }}
          />
          <div
            className={styles.playerBar__knob}
            style={{ left: `${shownFraction * 100}%` }}
          />
        </div>
        <span className={styles.playerBar__time}>
          {formatDuration(duration)}
        </span>
      </div>
      {touch ? null : (
        <div className={styles.playerBar__volume}>
          <VolumeControl />
        </div>
      )}
    </footer>
  );
}
