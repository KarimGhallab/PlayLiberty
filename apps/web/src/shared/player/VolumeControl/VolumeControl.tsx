import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@playliberty/i18n';

import VolumeToast from '../VolumeToast/VolumeToast';
import { usePlayerStore } from '../playerStore/playerStore';
import { volumeIcon } from '../volumeIcon';
import styles from './VolumeControl.module.scss';

/*
 * The volume control, the player bar's rightmost item. It is the bar's one
 * disclosure: the rail is 96px of vertical travel that would dwarf the 98px bar
 * if it stood open, so it is shown while the pointer is on the pair, focus is
 * inside it or a tap has just landed, and gone once none holds. The focus and
 * pointer halves are what let a keyboard and a touch user reach the level: focus
 * opens the rail and a tap opens it too, where hover alone never would.
 *
 * The button is a mute, not an open. A press silences the output and leaves the
 * level alone, so unmuting returns to exactly where the listener had it; the rail
 * is the only thing that changes the level by pointer.
 *
 * Up, Down and M are bound on the window rather than on the control, because a
 * listener reaches for the volume without first finding it, and the bar is
 * always on screen once something plays. A text field and a held modifier are the
 * two places the keys are left alone. Up and Down change the level whether or not
 * the output is muted, so a listener who mutes, adjusts, then unmutes lands where
 * they set it.
 *
 * Up and Down also raise the volume notice, because the rail is the only other
 * readout and it is open only while the pointer is on it: a keyboard listener
 * would otherwise move the level with nothing on screen saying where it landed.
 * The notice is the keyboard's equal of the pointer's rail, and it is centred
 * above the bar so the two can each be up without covering the other.
 */

/** How much one press of Up/Down moves the volume. */
const KEYBOARD_STEP = 0.05;

/*
 * How long the notice stays after the last press. The host owns it: the value is
 * both the toast's own fade and the timeout that disposes it, so the two cannot
 * drift.
 */
const VOLUME_TOAST_MS = 1600;

/*
 * Pointer capture keeps a drag alive when the pointer leaves the rail, which is
 * the difference between a drag that survives an impatient hand and one that
 * stops at the rail's edge. It is a nicety rather than the change itself, so a
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

      /* The store is read at press time rather than closed over, so a key never
       * acts on a level the listener has already changed. */
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
   * The pointer's y against the rail's own box, as a level. The box is the truth
   * and the store is not: the store's level is whatever the last interaction
   * wrote, and the target is where the pointer is now. The rail fills upward, so
   * the top of the box is full and the bottom is silent.
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
      /* The pointer's own open. Hover reaches a mouse, but a touch browser may
       * never synthesize a mouseenter before the tap lands, so the rail opens on
       * the pointerdown itself and a tap is not at the mercy of that synthesis. */
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
