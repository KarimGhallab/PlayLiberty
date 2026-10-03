import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { CreatePlaylistInputSchema } from '@playliberty/contracts';

import styles from './AddPlaylistDialog.module.scss';

/*
 * The add-playlist dialog, and the library's only dialog. One field, because
 * `CreatePlaylistInputSchema` has one. The schema is the client's own half of the
 * check and the server's is the other: an empty or malformed URL never leaves the
 * browser, and a URL the server refuses comes back as a problem shown in this same
 * slot. The dialog never invents a message for a refusal.
 *
 * `problem` is the server's `detail`, passed down from the mutation. While there
 * is none, a submit that the schema refuses writes its own sentence here. The two
 * share one slot because a person sees one field and one thing wrong with it, not
 * a client error and a server error as separate layers.
 *
 * `open` drives a two-phase presence rather than a mount. The dialog stays mounted
 * through its exit so the fade can run, and unmounts when that duration has
 * elapsed; `onClose` reports that the exit has finished, which is when the caller
 * clears anything it was holding for the dialog. A caller that flipped `open` false
 * and tore the node down in the same turn would have no exit at all, so the node's
 * life is this component's and not the caller's.
 *
 * The exit duration is one number, `EXIT_MS`, and it is set as `--dialog-motion` on
 * the scrim so the CSS animation and the unmount timer cannot drift: the stylesheet
 * reads the property rather than naming `--motion-base` a second time. The timer is
 * what ends the exit, not `animationend`, because a browser that suppresses the
 * animation (reduced motion, or a tab that never composites) may never fire that
 * event, and a dialog that only unmounts on an event is a dialog that can strand
 * itself over the page.
 */

interface AddPlaylistDialogProps {
  open: boolean;
  onSubmit: (url: string) => void;
  onClose: () => void;
  isWorking?: boolean;
  problem?: string | null;
}

/* `--motion-base`, 180ms. The one place the component names a time. */
const EXIT_MS = 180;

/*
 * The exit duration reaches the stylesheet as a custom property, which React's
 * style typing does not know by name, so the value is one cast at the boundary
 * rather than an `any` at the call site.
 */
const scrimStyle = {
  '--dialog-motion': `${EXIT_MS}ms`
} as CSSProperties;

/*
 * A reader who asked for no motion gets the state change with no wait and no
 * animation. The base stylesheet drops the animation under `prefers-reduced-motion`,
 * so the component checks the same preference and closes at once in that case.
 */
function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function AddPlaylistDialog({
  open,
  onSubmit,
  onClose,
  isWorking = false,
  problem = null
}: AddPlaylistDialogProps) {
  const fieldId = useId();
  const messageId = useId();
  const field = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  /*
   * The dialog opens on the one field, because the field is the task. Focus runs
   * when the node actually mounts, not when `open` flips, because the first render
   * with `open` true returns null until `mounted` catches up and the field does
   * not exist yet. Focus is restored by the unmount, which returns it to whichever
   * control opened it.
   */
  useEffect(() => {
    if (mounted) {
      field.current?.focus();
    }
  }, [mounted]);

  /*
   * Presence is two phases. Opening mounts the node and runs the arrival; closing
   * keeps it mounted while the reverse runs, and a timer at the same duration is
   * what unmounts it. A dialog that was never open stays unmounted, so an unseen
   * node never paints a frame at full opacity.
   */
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }

    if (!mounted) {
      return;
    }

    if (prefersReducedMotion()) {
      setMounted(false);
      onClose();
      return;
    }

    setClosing(true);

    const exit = window.setTimeout(() => {
      setMounted(false);
      onClose();
    }, EXIT_MS);

    return () => window.clearTimeout(exit);
  }, [open]);

  /*
   * Escape closes, from anywhere in the dialog, which is what a modal is expected
   * to do and the only keyboard path back out.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        requestClose();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  /*
   * A server problem is the whole of the message while it stands. Typing clears
   * it, so a corrected URL is not still accused by the previous refusal; the
   * schema's own message replaces it on the next submit.
   */
  const message = invalid ?? problem;

  function submit(): void {
    if (isWorking) {
      return;
    }

    const trimmed = url.trim();
    const parsed = CreatePlaylistInputSchema.safeParse({ url: trimmed });

    if (!parsed.success) {
      setInvalid(
        'Paste a YouTube playlist link, such as https://youtube.com/playlist?list=...'
      );
      return;
    }

    setInvalid(null);
    onSubmit(trimmed);
  }

  /*
   * The exit, wherever it is entered from. A reduced-motion reader skips straight
   * to the end, because the animation is not running and nothing is coming.
   */
  function requestClose(): void {
    if (closing) {
      return;
    }

    if (prefersReducedMotion()) {
      setMounted(false);
      onClose();
      return;
    }

    setClosing(true);
    window.setTimeout(() => {
      setMounted(false);
      onClose();
    }, EXIT_MS);
  }

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={styles.scrim}
      style={scrimStyle}
      data-closing={closing ? 'true' : undefined}
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${fieldId}-head`}>
        <h3 className={styles.dialog__head} id={`${fieldId}-head`}>
          Add a playlist
        </h3>
        <p className={styles.dialog__body}>
          Paste a YouTube playlist link. Nothing is downloaded until you sync
          it, and from then on the audio is yours.
        </p>
        <div
          className={styles.field}
          data-invalid={message === null ? undefined : 'true'}
          data-disabled={isWorking ? 'true' : undefined}>
          <label className={styles.field__label} htmlFor={fieldId}>
            Playlist link
          </label>
          <input
            ref={field}
            className={styles.field__input}
            id={fieldId}
            type="url"
            placeholder="https://youtube.com/playlist?list=..."
            value={url}
            disabled={isWorking}
            aria-invalid={message === null ? undefined : true}
            aria-describedby={message === null ? undefined : messageId}
            onChange={event => {
              setUrl(event.target.value);
              setInvalid(null);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                submit();
              }
            }}
          />
          {message === null ? null : (
            <span className={styles.field__message} id={messageId} role="alert">
              {message}
            </span>
          )}
        </div>
        <div className={styles.dialog__actions}>
          <button
            className={styles.dialog__secondary}
            type="button"
            disabled={isWorking}
            onClick={requestClose}>
            Cancel
          </button>
          <button
            className={styles.dialog__primary}
            type="button"
            data-loading={isWorking ? 'true' : undefined}
            aria-busy={isWorking}
            onClick={submit}>
            {isWorking ? (
              <>
                <span className={styles.dialog__spinner} aria-hidden="true" />
                Adding
              </>
            ) : (
              'Add'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
