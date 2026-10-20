import { IconPhoto } from '@tabler/icons-react';
import { useEffect, useId, useRef, useState } from 'react';

import type { Playlist } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';
import { sleeveIndex } from '@playliberty/ui-foundation';

import { usePlaylistCover } from '../../playlistCover/usePlaylistCover';
import Dialog from '../Dialog/Dialog';
import dialogStyles from '../Dialog/Dialog.module.scss';
import Spinner from '../Spinner/Spinner';
import styles from './CoverDialog.module.scss';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

interface CoverDialogProps {
  readonly open: boolean;
  readonly playlist: Playlist;
  readonly onSubmit: (file: File) => void;
  readonly onRemove?: () => void;
  readonly onClose: () => void;
  readonly onClosed?: () => void;
  readonly isWorking?: boolean;
  readonly isRemoving?: boolean;
  readonly problem?: string | null;
  readonly removeProblem?: string | null;
}

/*
 * One square is the whole cover surface: the current, chosen, or post-removal
 * image, with the labelled button below as its keyboard path. The server owns
 * the bytes; this dialog checks type and size and asks before removing.
 */
export default function CoverDialog({
  open,
  playlist,
  onSubmit,
  onRemove,
  onClose,
  onClosed,
  isWorking = false,
  isRemoving = false,
  problem = null,
  removeProblem = null
}: CoverDialogProps) {
  const { t } = useI18n();
  const messageId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const { cover: currentCover, onCoverError } = usePlaylistCover(playlist);
  const { cover: replacementCover, onCoverError: onReplacementError } =
    usePlaylistCover(playlist, false);

  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setFile(null);
      setPreviewUrl(null);
      setPreviewFailed(false);
      setInvalid(null);
      setConfirmingDiscard(false);
      setConfirmingRemove(false);
      setDragging(false);
    }
  }

  useEffect(() => {
    if (previewUrl === null) {
      return;
    }

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const busy = isWorking || isRemoving;
  const canRemove = onRemove !== undefined && playlist.coverUpdatedAt !== null;
  const message = invalid ?? (confirmingRemove ? removeProblem : problem);
  const dirty = file !== null;
  const source = confirmingRemove
    ? replacementCover
    : file === null
      ? currentCover
      : previewFailed
        ? null
        : previewUrl;
  const onImageError = confirmingRemove
    ? onReplacementError
    : file === null
      ? onCoverError
      : () => setPreviewFailed(true);

  function selectFile(selected: File): void {
    if (busy) {
      return;
    }

    if (!ACCEPTED_TYPES.has(selected.type)) {
      setInvalid(t('coverDialog.wrongType'));
      return;
    }

    if (selected.size > MAX_BYTES) {
      setInvalid(t('coverDialog.tooLarge'));
      return;
    }

    setInvalid(null);
    setPreviewFailed(false);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function requestClose(): void {
    if (busy) {
      return;
    }

    if (confirmingRemove) {
      setConfirmingRemove(false);
      return;
    }

    if (confirmingDiscard) {
      setConfirmingDiscard(false);
      return;
    }

    if (!dirty) {
      onClose();
      return;
    }

    setConfirmingDiscard(true);
  }

  function submit(): void {
    if (busy || file === null) {
      return;
    }

    onSubmit(file);
  }

  return (
    <Dialog
      open={open}
      title={t('coverDialog.title')}
      description={t('coverDialog.description')}
      initialFocus={chooseButton}
      onRequestClose={requestClose}
      onClosed={onClosed}
      actions={
        confirmingRemove ? (
          <>
            <button
              className={dialogStyles.dialog__secondary}
              type="button"
              disabled={busy}
              onClick={() => setConfirmingRemove(false)}>
              {t('common.cancel')}
            </button>
            <button
              className={dialogStyles.dialog__primary}
              type="button"
              data-destructive="true"
              data-loading={isRemoving ? 'true' : undefined}
              aria-busy={isRemoving}
              disabled={busy}
              onClick={onRemove}>
              {isRemoving ? (
                <>
                  <Spinner />
                  {t('coverDialog.removing')}
                </>
              ) : (
                t('coverDialog.remove')
              )}
            </button>
          </>
        ) : confirmingDiscard ? (
          <>
            <button
              className={dialogStyles.dialog__secondary}
              type="button"
              onClick={() => setConfirmingDiscard(false)}>
              {t('common.keepEditing')}
            </button>
            <button
              className={dialogStyles.dialog__primary}
              type="button"
              onClick={onClose}>
              {t('common.discard')}
            </button>
          </>
        ) : (
          <>
            <button
              className={dialogStyles.dialog__secondary}
              type="button"
              disabled={busy}
              onClick={requestClose}>
              {t('common.cancel')}
            </button>
            <button
              className={dialogStyles.dialog__primary}
              type="button"
              data-loading={isWorking ? 'true' : undefined}
              aria-busy={isWorking}
              disabled={busy || file === null}
              onClick={submit}>
              {isWorking ? (
                <>
                  <Spinner />
                  {t('coverDialog.saving')}
                </>
              ) : (
                t('coverDialog.save')
              )}
            </button>
          </>
        )
      }>
      {confirmingRemove ? (
        <p className={dialogStyles.dialog__discard} role="alert">
          {t('coverDialog.removePrompt')}
        </p>
      ) : null}
      {confirmingDiscard ? (
        <p className={dialogStyles.dialog__discard} role="alert">
          {t('coverDialog.discardPrompt')}
        </p>
      ) : null}
      <div className={styles.cover}>
        <div
          className={styles.cover__square}
          data-cover-drop
          data-art={source === null ? 'no-art' : 'art'}
          data-dragging={dragging ? 'true' : undefined}
          data-sleeve={source === null ? sleeveIndex(playlist.id) : undefined}
          aria-hidden="true"
          onDragEnter={() => {
            if (!busy) {
              setDragging(true);
            }
          }}
          onDragOver={event => {
            event.preventDefault();

            if (!busy) {
              setDragging(true);
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => {
            event.preventDefault();
            setDragging(false);

            const dropped = event.dataTransfer.files[0];

            if (dropped !== undefined) {
              selectFile(dropped);
            }
          }}>
          {source === null ? (
            <IconPhoto
              className={styles.cover__placeholder}
              aria-hidden="true"
              focusable="false"
            />
          ) : (
            <img
              className={styles.cover__image}
              src={source}
              alt=""
              decoding="async"
              onError={onImageError}
            />
          )}
          {dragging ? <span className={styles.cover__hint} /> : null}
        </div>
        <input
          ref={fileInput}
          className={styles.cover__input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          hidden
          onChange={event => {
            const selected = event.target.files?.[0];

            if (selected !== undefined) {
              selectFile(selected);
            }

            event.target.value = '';
          }}
        />
        <button
          ref={chooseButton}
          className={`${dialogStyles.dialog__secondary} ${styles.cover__choose}`}
          type="button"
          disabled={busy}
          aria-describedby={message === null ? undefined : messageId}
          onClick={() => fileInput.current?.click()}>
          {t('coverDialog.choose')}
        </button>
        {canRemove && !confirmingRemove ? (
          <button
            className={styles.cover__remove}
            type="button"
            disabled={busy}
            onClick={() => {
              setConfirmingDiscard(false);
              setConfirmingRemove(true);
            }}>
            {t('coverDialog.remove')}
          </button>
        ) : null}
      </div>
      {message === null ? null : (
        <p className={dialogStyles.field__message} id={messageId} role="alert">
          {message}
        </p>
      )}
    </Dialog>
  );
}
