import { useId, useRef, useState } from 'react';

import { RenamePlaylistInputSchema } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import Dialog from './Dialog/Dialog';
import styles from './Dialog/Dialog.module.scss';

/*
 * `RenamePlaylistInputSchema` is the client's own half of the check: an empty or
 * over-long name never leaves the browser. `problem` and the schema's message
 * share one slot, since a person sees one field and one thing wrong.
 */

interface RenamePlaylistDialogProps {
  open: boolean;
  currentName: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
  isWorking?: boolean;
  problem?: string | null;
}

export default function RenamePlaylistDialog({
  open,
  currentName,
  onSubmit,
  onClose,
  isWorking = false,
  problem = null
}: RenamePlaylistDialogProps) {
  const { t } = useI18n();
  const fieldId = useId();
  const messageId = useId();
  const field = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(currentName);
  const [invalid, setInvalid] = useState<string | null>(null);

  /* A cancelled edit must not linger, so the field resets to the current name
   * on each open; the value arrives selected, so a person can type over it. */
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setName(currentName);
      setInvalid(null);
    }
  }

  const message = invalid ?? problem;

  function submit(): void {
    if (isWorking) {
      return;
    }

    const trimmed = name.trim();
    const parsed = RenamePlaylistInputSchema.safeParse({ name: trimmed });

    if (!parsed.success) {
      setInvalid(t('renameDialog.invalid'));
      return;
    }

    setInvalid(null);
    onSubmit(parsed.data.name);
  }

  return (
    <Dialog
      open={open}
      title={t('renameDialog.title')}
      description={t('renameDialog.description')}
      initialFocus={field}
      onRequestClose={onClose}
      actions={
        <>
          <button
            className={styles.dialog__secondary}
            type="button"
            disabled={isWorking}
            onClick={onClose}>
            {t('common.cancel')}
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
                {t('renameDialog.saving')}
              </>
            ) : (
              t('renameDialog.save')
            )}
          </button>
        </>
      }>
      <div
        className={styles.field}
        data-invalid={message === null ? undefined : 'true'}
        data-disabled={isWorking ? 'true' : undefined}>
        <label className={styles.field__label} htmlFor={fieldId}>
          {t('renameDialog.nameLabel')}
        </label>
        <input
          ref={field}
          className={styles.field__input}
          id={fieldId}
          type="text"
          value={name}
          disabled={isWorking}
          aria-invalid={message === null ? undefined : true}
          aria-describedby={message === null ? undefined : messageId}
          onFocus={event => event.target.select()}
          onChange={event => {
            setName(event.target.value);
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
