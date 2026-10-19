import { useEffect, useId, useRef, useState } from 'react';

import { CreatePlaylistInputSchema } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import Dialog from '../../../shared/components/Dialog/Dialog';
import dialogStyles from '../../../shared/components/Dialog/Dialog.module.scss';
import Spinner from '../../../shared/components/Spinner/Spinner';

import styles from './AddPlaylistDialog.module.scss';

/*
 * The schema is the client's half of the check and the server's is the other: a
 * URL the server refuses comes back as a problem in the same slot, so the one
 * field shows one thing wrong with it.
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
   * A fresh open must not inherit the last one's paste or choice, so the field
   * and the setting reset here.
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
   * Typing clears the server's problem, so a corrected URL is not still accused
   * by the previous refusal.
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
                <Spinner />
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
