import { useEffect, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent
} from 'react';

import { useI18n } from '@playliberty/i18n';

import VolumeToast from '../VolumeToast/VolumeToast';
import { usePlayerStore } from '../playerStore/playerStore';
import { ownsArrowKey, ownsGlobalKey } from '../transportKeys';
import { volumeIcon } from '../volumeIcon';
import styles from './VolumeControl.module.scss';

/*
 * The volume control: the rail opens on pointer, focus or a tap; the button
 * mutes and keeps the level; Up, Down and M are bound on the window.
 */

/** How much one press of Up/Down moves the volume. */
const KEYBOARD_STEP = 0.05;

/*
 * How long the notice stays. The same value is the toast's fade duration and
 * the host's timeout, so the two cannot drift.
 */
const VOLUME_TOAST_MS = 1600;

function clampLevel(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function levelForKey(key: string, value: number): number | null {
  switch (key) {
    case 'ArrowUp':
    case 'ArrowRight':
      return clampLevel(value + KEYBOARD_STEP);
    case 'ArrowDown':
    case 'ArrowLeft':
      return clampLevel(value - KEYBOARD_STEP);
    case 'Home':
      return 0;
    case 'End':
      return 1;
    default:
      return null;
  }
}

function useVolumeRail(volume: number, onChange: (volume: number) => void) {
  const rail = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [held, setHeld] = useState(false);

  const levelAt = (clientX: number): number => {
    const box = rail.current?.getBoundingClientRect();

    if (box === undefined || box.width === 0) {
      return 0;
    }

    return clampLevel((clientX - box.left) / box.width);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    dragging.current = true;
    setHeld(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onChange(levelAt(event.clientX));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (dragging.current) {
      onChange(levelAt(event.clientX));
    }
  };

  const stop = (event: ReactPointerEvent<HTMLDivElement>): void => {
    dragging.current = false;
    setHeld(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const next = levelForKey(event.key, volume);

    if (next === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onChange(next);
  };

  return {
    ref: rail,
    held,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: stop,
      onPointerCancel: stop,
      onKeyDown
    }
  };
}

export default function VolumeControl() {
  const { t } = useI18n();
  const volume = usePlayerStore(state => state.volume);
  const muted = usePlayerStore(state => state.muted);
  const setVolume = usePlayerStore(state => state.setVolume);
  const setMuted = usePlayerStore(state => state.setMuted);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  const rail = useVolumeRail(volume, setVolume);
  const percent = Math.round(volume * 100);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      /* Read the store at press time, so a key never acts on a stale level. */
      const state = usePlayerStore.getState();

      if (event.key === 'ArrowUp') {
        if (ownsArrowKey(event)) {
          return;
        }

        event.preventDefault();
        setVolume(state.volume + KEYBOARD_STEP);
        setNotice(token => (token ?? 0) + 1);
        return;
      }

      if (event.key === 'ArrowDown') {
        if (ownsArrowKey(event)) {
          return;
        }

        event.preventDefault();
        setVolume(state.volume - KEYBOARD_STEP);
        setNotice(token => (token ?? 0) + 1);
        return;
      }

      if (event.key === 'm' || event.key === 'M') {
        if (ownsGlobalKey(event)) {
          return;
        }

        event.preventDefault();
        setMuted(!state.muted);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setVolume, setMuted]);

  useEffect(() => {
    if (notice === null) {
      return;
    }

    const id = window.setTimeout(() => setNotice(null), VOLUME_TOAST_MS);
    return () => window.clearTimeout(id);
  }, [notice]);

  const Icon = volumeIcon(volume, muted);

  return (
    <div
      ref={root}
      className={styles.volume}
      onMouseEnter={() => {
        hovering.current = true;
        setOpen(true);
      }}
      onMouseLeave={() => {
        hovering.current = false;

        if (!root.current?.contains(document.activeElement)) {
          setOpen(false);
        }
      }}
      /*
       * Open on the pointerdown itself: a touch browser may never synthesize
       * the mouseenter a tap would need.
       */
      onPointerDown={() => setOpen(true)}
      onFocus={() => setOpen(true)}
      onBlur={event => {
        if (
          !hovering.current &&
          !root.current?.contains(event.relatedTarget as Node | null)
        ) {
          setOpen(false);
        }
      }}>
      <button
        type="button"
        className={styles.volume__button}
        data-muted={muted ? 'true' : undefined}
        aria-label={muted ? t('volume.unmute') : t('volume.mute')}
        aria-pressed={muted}
        onClick={() => setMuted(!muted)}>
        <Icon
          className={styles.volume__icon}
          aria-hidden="true"
          focusable="false"
        />
      </button>
      <div className={styles.volume__inline} data-open={open || undefined}>
        <div
          ref={rail.ref}
          className={styles.volume__inlineRail}
          role="slider"
          tabIndex={open ? 0 : -1}
          aria-hidden={open ? undefined : true}
          aria-label={t('volume.label')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${percent}%`}
          aria-orientation="horizontal"
          data-dragging={rail.held || undefined}
          {...rail.handlers}>
          <span
            className={styles.volume__inlineFill}
            data-muted={muted ? 'true' : undefined}
            style={{ width: `${percent}%` }}
          />
          <span
            className={styles.volume__inlineKnob}
            style={{ left: `${percent}%` }}
          />
        </div>
      </div>
      {notice === null ? null : (
        <VolumeToast
          key={notice}
          volume={volume}
          muted={muted}
          durationMs={VOLUME_TOAST_MS}
        />
      )}
    </div>
  );
}
