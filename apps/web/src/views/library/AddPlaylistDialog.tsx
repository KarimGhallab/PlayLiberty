import { useEffect, useId, useRef, useState } from 'react';

import { CreatePlaylistInputSchema } from '@playliberty/contracts';

import Dialog from '../../shared/components/Dialog';
import styles from '../../shared/components/Dialog.module.scss';

/*
 * The add-playlist dialog, and the library's only door to a new playlist. One
 * field, because `CreatePlaylistInputSchema` has one. The schema is the client's
 * own half of the check and the server's is the other: an empty or malformed URL
 * never leaves the browser, and a URL the server refuses comes back as a problem
 * shown in this same slot. The dialog never invents a message for a refusal.
 *
 * `problem` is the server's `detail`, passed down from the mutation. While there
 * is none, a submit that the schema refuses writes the same refusal here, so the
 * one slot reads the same whichever layer said no: a person sees one field and
 * one thing wrong with it, not a client error and a server error as separate
 * layers.
 *
 * The shell, the motion and the two-phase presence belong to `Dialog`; this
 * component is the field and the two verbs.
 */

interface AddPlaylistDialogProps {
  open: boolean;
  onSubmit: (url: string) => void;
  onClose: () => void;
  isWorking?: boolean;
  problem?: string | null;
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
  const [wasOpen, setWasOpen] = useState(open);

  /*
   * A fresh dialog opens on an empty field, so a cancelled paste does not linger
   * into the next open.
   */
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setUrl('');
      setInvalid(null);
    }
  }

  /*
   * The server problem is the whole of the message while it stands. Typing clears
   * it, so a corrected URL is not still accused by the previous refusal; the
   * schema's own message replaces it on the next submit.
   */
  const message = invalid ?? problem;

  useEffect(() => {
    setInvalid(null);
  }, [problem]);

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

  return (
    <Dialog
      open={open}
      title="Add a playlist"
      description="Paste a YouTube playlist link. Nothing is downloaded until you sync it, and from then on the audio is yours."
      initialFocus={field}
      onRequestClose={onClose}
      actions={
        <>
          <button
            className={styles.dialog__secondary}
            type="button"
            disabled={isWorking}
            onClick={onClose}>
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
        </>
      }>
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
    </Dialog>
  );
}
