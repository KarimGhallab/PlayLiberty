import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@playliberty/i18n';

import VolumeToast from '../VolumeToast/VolumeToast';
import { usePlayerStore } from '../playerStore/playerStore';
import { volumeIcon } from '../volumeIcon';
import styles from './VolumeControl.module.scss';

/*
 * The volume control: the bar's one disclosure, its rail shown while pointer,
 * focus or a tap holds it. The button mutes and keeps the level, so unmuting
 * returns to it; Up, Down and M are bound on the window.
 */

/** How much one press of Up/Down moves the volume. */
const KEYBOARD_STEP = 0.05;

/*
 * How long the notice stays. The same value is the toast's fade duration and
 * the host's timeout, so the two cannot drift.
 */
const VOLUME_TOAST_MS = 1600;

/* Pointer capture keeps a drag alive when the pointer leaves the rail. A host
 * without it (jsdom) must not throw, so the call is optional-chained. */
function capturePointer(element: HTMLElement, pointerId: number): void {
  element.setPointerCapture?.(pointerId);
}

function releasePointer(element: HTMLElement, pointerId: number): void {
  element.releasePointerCapture?.(pointerId);
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
  const rail = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const hovering = useRef(false);

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

      /* Read the store at press time, so a key never acts on a stale level. */
      const state = usePlayerStore.getState();

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setVolume(state.volume + KEYBOARD_STEP);
        setNotice(token => (token ?? 0) + 1);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setVolume(state.volume - KEYBOARD_STEP);
        setNotice(token => (token ?? 0) + 1);
        return;
      }

      if (event.key === 'm' || event.key === 'M') {
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

  /*
   * The pointer's y against the rail's box, as a level: the box is truth, not
   * the store. The rail fills upward, so top is full and bottom silent.
   */
  const volumeAt = (clientY: number): number => {
    const box = rail.current?.getBoundingClientRect();

    if (box === undefined || box.height === 0) {
      return 0;
    }

    return Math.min(1, Math.max(0, (box.bottom - clientY) / box.height));
  };

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
      {open ? (
        <div className={styles.volume__panel}>
          <div
            className={styles.volume__track}
            ref={rail}
            role="slider"
            tabIndex={0}
            aria-label={t('volume.label')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            aria-orientation="vertical"
            onPointerDown={event => {
              dragging.current = true;
              capturePointer(event.currentTarget, event.pointerId);
              setVolume(volumeAt(event.clientY));
            }}
            onPointerMove={event => {
              if (dragging.current) {
                setVolume(volumeAt(event.clientY));
              }
            }}
            onPointerUp={event => {
              dragging.current = false;
              releasePointer(event.currentTarget, event.pointerId);
            }}
            onKeyDown={event => {
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                event.stopPropagation();
                setVolume(volume + KEYBOARD_STEP);
              }

              if (event.key === 'ArrowDown') {
                event.preventDefault();
                event.stopPropagation();
                setVolume(volume - KEYBOARD_STEP);
              }
            }}>
            <span
              className={styles.volume__fill}
              style={{ height: `${volume * 100}%` }}
              data-muted={muted ? 'true' : undefined}
            />
            <span
              className={styles.volume__knob}
              style={{ bottom: `${volume * 100}%` }}
            />
          </div>
          <span className={styles.volume__readout}>
            {Math.round(volume * 100)}
          </span>
        </div>
      ) : null}
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
