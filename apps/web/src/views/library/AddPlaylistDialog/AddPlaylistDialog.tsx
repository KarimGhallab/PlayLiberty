import { useEffect, useId, useRef, useState } from 'react';

import { CreatePlaylistInputSchema } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import Dialog from '../../../shared/components/Dialog/Dialog';
import dialogStyles from '../../../shared/components/Dialog/Dialog.module.scss';

import styles from './AddPlaylistDialog.module.scss';

/*
 * The add-playlist dialog, and the library's only door to a new playlist. One
 * field and one choice: the URL, because `CreatePlaylistInputSchema` takes it, and
 * whether the playlist skips the non-music parts of its videos, on by default so
 * the common case gets the behaviour without hunting for a setting. The choice
 * sets the playlist's initial value; the detail's switch changes it later.
 *
 * The schema is the client's own half of the check and the server's is the other:
 * an empty or malformed URL never leaves the browser, and a URL the server refuses
 * comes back as a problem shown in this same slot. The dialog never invents a
 * message for a refusal.
 *
 * `problem` is the server's `detail`, passed down from the mutation. While there
 * is none, a submit that the schema refuses writes the same refusal here, so the
 * one slot reads the same whichever layer said no: a person sees one field and
 * one thing wrong with it, not a client error and a server error as separate
 * layers.
 *
 * The shell, the motion and the two-phase presence belong to `Dialog`; this
 * component is the field, the choice and the two verbs.
 */

interface AddPlaylistDialogProps {
  open: boolean;
  onSubmit: (url: string, skipNonMusic: boolean) => void;
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
  const { t } = useI18n();
  const fieldId = useId();
  const messageId = useId();
  const checkId = useId();
  const hintId = useId();
  const field = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [skipNonMusic, setSkipNonMusic] = useState(true);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  /*
   * A fresh dialog opens on an empty field and the setting on, so a cancelled
   * paste and a cancelled choice do not linger into the next open.
   */
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setUrl('');
      setSkipNonMusic(true);
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
      setInvalid(t('addPlaylistDialog.invalid'));
      return;
    }

    setInvalid(null);
    onSubmit(trimmed, skipNonMusic);
  }

  return (
    <Dialog
      open={open}
      title={t('addPlaylistDialog.title')}
      description={t('addPlaylistDialog.description')}
      initialFocus={field}
      onRequestClose={onClose}
      actions={
        <>
          <button
            className={dialogStyles.dialog__secondary}
            type="button"
            disabled={isWorking}
            onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className={dialogStyles.dialog__primary}
            type="button"
            data-loading={isWorking ? 'true' : undefined}
            aria-busy={isWorking}
            onClick={submit}>
            {isWorking ? (
              <>
                <span
                  className={dialogStyles.dialog__spinner}
                  aria-hidden="true"
                />
                {t('addPlaylistDialog.adding')}
              </>
            ) : (
              t('addPlaylistDialog.add')
            )}
          </button>
        </>
      }>
      <div
        className={dialogStyles.field}
        data-invalid={message === null ? undefined : 'true'}
        data-disabled={isWorking ? 'true' : undefined}>
        <label className={dialogStyles.field__label} htmlFor={fieldId}>
          {t('addPlaylistDialog.linkLabel')}
        </label>
        <input
          ref={field}
          className={dialogStyles.field__input}
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
          <span
            className={dialogStyles.field__message}
            id={messageId}
            role="alert">
            {message}
          </span>
        )}
      </div>
      {/*
       * The playlist's initial skip setting. The label carries the name and the
       * hint carries what it does.
       */}
      <div className={styles.check}>
        <label className={styles.check__row} htmlFor={checkId}>
          <input
            className={styles.check__box}
            id={checkId}
            type="checkbox"
            checked={skipNonMusic}
            disabled={isWorking}
            aria-describedby={hintId}
            onChange={event => setSkipNonMusic(event.target.checked)}
          />
          <span className={styles.check__name}>
            {t('addPlaylistDialog.skip')}
          </span>
        </label>
        <span className={styles.check__hint} id={hintId}>
          {t('addPlaylistDialog.skipHint')}
        </span>
      </div>
    </Dialog>
  );
}
