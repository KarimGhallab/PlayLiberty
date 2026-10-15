import { IconPlayerSkipBack, IconPlayerSkipForward } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';

import { formatDuration, useI18n } from '@playliberty/i18n';

import { API_PREFIX } from '../../api/client/client';
import PlayGlyph from '../../components/PlayGlyph';
import { usePlayPauseMorph } from '../../components/usePlayPauseMorph/usePlayPauseMorph';
import VolumeControl from '../VolumeControl/VolumeControl';
import { usePlayerStore } from '../playerStore/playerStore';
import { currentTrack, hasNext } from '../types';
import styles from './PlayerBar.module.scss';

/*
 * The player bar, the shell's only persistent chrome and the one component whose
 * height is paid for by the list it covers. The middle column of the grid is the
 * transport, so the transport posts 0px of offset and the title has equal room
 * either side.
 *
 * The bar is absent at rest and appears on the first track, because 98px on the
 * landing screen would be spent on a play that cannot act. Once playback exists
 * the bar persists across both routes, because music keeps playing while the
 * listener browses elsewhere.
 *
 * The transport is always drawn once the bar exists, unlike the header's, which
 * is absent unless the playlist is playing: the bar is the one place a listener
 * goes looking for the steps, and a control that appears and disappears there is
 * worse than one that is always present.
 */

/** How many seconds one press of an arrow key moves the playhead. */
const KEYBOARD_STEP_SECONDS = 5;

/*
 * Pointer capture keeps the drag alive when the pointer leaves the track, which
 * is the difference between a scrub that survives an impatient hand and one that
 * stops at the track's edge. It is a nicety rather than the seek itself, so a
 * host that does not implement it loses the drag-outside behaviour and nothing
 * else; jsdom is one such host, and an unguarded call would take the whole
 * handler down with it.
 */
function capturePointer(element: HTMLElement, pointerId: number): void {
  element.setPointerCapture?.(pointerId);
}

function releasePointer(element: HTMLElement, pointerId: number): void {
  element.releasePointerCapture?.(pointerId);
}

export default function PlayerBar() {
  const { t } = useI18n();
  const current = usePlayerStore(currentTrack);
  const positionSeconds = usePlayerStore(state => state.positionSeconds);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const seek = usePlayerStore(state => state.seek);
  const skipNext = usePlayerStore(state => state.skipNext);
  const skipPrevious = usePlayerStore(state => state.skipPrevious);
  const canSkipNext = usePlayerStore(hasNext);
  const scrubRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const { run, endRun } = usePlayPauseMorph(isPlaying);

  /*
   * The keyboard transport, bound to the window so a press reaches the player
   * wherever focus sits. Space toggles playback; the arrows move the playhead by
   * the same step the focused seeker uses. Text entry keeps its keys: an input, a
   * textarea or any editable region is left alone, which is the one place a
   * shortcut for a letterless key would cost the listener something. The store is
   * read at press time rather than closed over, so a shortcut never acts on a
   * track the listener has already left.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest('input, textarea, select') !== null)
      ) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const state = usePlayerStore.getState();

      if (state.currentId === null) {
        return;
      }

      if (event.key === ' ' && !event.repeat) {
        event.preventDefault();
        state.setPlaying(!state.isPlaying);
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();

        const duration = currentTrack(state)?.durationSeconds ?? 0;
        const step =
          event.key === 'ArrowRight'
            ? KEYBOARD_STEP_SECONDS
            : -KEYBOARD_STEP_SECONDS;

        state.seek(
          Math.max(0, Math.min(duration, state.positionSeconds + step))
        );
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
  const artwork =
    current.thumbnailPath === null
      ? null
      : `${API_PREFIX}/tracks/${current.id}/thumbnail`;

  /* The pointer's x against the track's own box, in seconds. The element is the
   * truth for the target, not the store, because the store's position is
   * whatever the last interaction wrote. */
  const secondsAt = (clientX: number): number => {
    const box = scrubRef.current?.getBoundingClientRect();

    if (box === undefined || box.width === 0 || duration <= 0) {
      return 0;
    }

    const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));

    return ratio * duration;
  };

  const seekToPointer = (clientX: number): void => {
    seek(secondsAt(clientX));
  };

  return (
    <footer
      className={styles.playerBar}
      aria-label={t('playerBar.label')}
      data-state={isPlaying ? 'playing' : 'paused'}>
      <span
        className={styles.playerBar__art}
        data-art={artwork === null ? 'no-art' : 'art'}>
        {artwork === null ? null : (
          <img
            className={styles.playerBar__image}
            src={artwork}
            alt=""
            decoding="async"
          />
        )}
      </span>
      <div className={styles.playerBar__top}>
        <div className={styles.playerBar__id}>
          <span className={styles.playerBar__name}>
            <span className={styles.playerBar__title}>{current.title}</span>
            <span className={styles.playerBar__source}>
              {current.playlistName}
            </span>
          </span>
        </div>
        <div className={styles.playerBar__transport}>
          <button
            type="button"
            className={styles.playerBar__step}
            aria-label={t('playerBar.previous')}
            onClick={() => skipPrevious()}>
            <IconPlayerSkipBack
              className={styles.playerBar__stepIcon}
              aria-hidden="true"
              focusable="false"
            />
          </button>
          <button
            type="button"
            className={styles.playerBar__play}
            aria-label={isPlaying ? t('playerBar.pause') : t('playerBar.play')}
            data-run={run}
            onAnimationEnd={endRun}
            onClick={() => setPlaying(!isPlaying)}>
            <PlayGlyph
              className={styles.playerBar__glyph}
              stripClassName={styles.playerBar__strip}
            />
          </button>
          <button
            type="button"
            className={styles.playerBar__step}
            aria-label={t('playerBar.next')}
            disabled={!canSkipNext}
            onClick={() => skipNext()}>
            <IconPlayerSkipForward
              className={styles.playerBar__stepIcon}
              aria-hidden="true"
              focusable="false"
            />
          </button>
        </div>
      </div>
      <div className={styles.playerBar__position}>
        <span className={styles.playerBar__time}>
          {formatDuration(elapsed)}
        </span>
        <div
          ref={scrubRef}
          className={styles.playerBar__scrub}
          role="slider"
          tabIndex={0}
          aria-label={t('playerBar.position')}
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={elapsed}
          aria-valuetext={t('playerBar.positionValue', {
            elapsed: formatDuration(elapsed),
            duration: formatDuration(duration)
          })}
          onPointerDown={event => {
            draggingRef.current = true;
            capturePointer(event.currentTarget, event.pointerId);
            seekToPointer(event.clientX);
          }}
          onPointerMove={event => {
            if (draggingRef.current) {
              seekToPointer(event.clientX);
            }
          }}
          onPointerUp={event => {
            draggingRef.current = false;
            releasePointer(event.currentTarget, event.pointerId);
          }}
          onKeyDown={event => {
            if (event.key === 'Home') {
              seek(0);
            }

            if (event.key === 'End') {
              seek(duration);
            }
          }}>
          <div
            className={styles.playerBar__fill}
            style={{ transform: `scaleX(${fraction})` }}
          />
          <div
            className={styles.playerBar__knob}
            style={{ left: `${fraction * 100}%` }}
          />
        </div>
        <span className={styles.playerBar__time}>
          {formatDuration(duration)}
        </span>
      </div>
      <div className={styles.playerBar__volume}>
        <VolumeControl />
      </div>
    </footer>
  );
}
