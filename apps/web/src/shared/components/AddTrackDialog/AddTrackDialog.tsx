import { useEffect, useId, useRef, useState } from 'react';

import type { AddTrackResult, Playlist } from '@playliberty/contracts';
import { AddTrackInputSchema, AddTrackOutcome } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import Dialog from '../Dialog/Dialog';
import dialogStyles from '../Dialog/Dialog.module.scss';
import Spinner from '../Spinner/Spinner';
import styles from './AddTrackDialog.module.scss';

/*
 * The add-a-track dialog: one request for the whole batch, resolving the video
 * once and answering one outcome per chosen playlist. A refusal names the
 * playlists and no cause, so the batch cannot enumerate other accounts'.
 */

interface AddTrackDialogProps {
  open: boolean;
  /* The playlist the dialog was opened from, preselected in the list. */
  currentPlaylistId: string;
  /* Every writable playlist, the current one included. Never a read-only one. */
  playlists: Playlist[];
  onSubmit: (url: string, playlistIds: string[]) => void;
  onClose: () => void;
  isWorking?: boolean;
  /* The batch's own answer, one outcome per chosen playlist. */
  result?: AddTrackResult | null;
  /* A whole-request refusal, which is the server's problem document. */
  problem?: string | null;
}

export default function AddTrackDialog({
  open,
  currentPlaylistId,
  playlists,
  onSubmit,
  onClose,
  isWorking = false,
  result = null,
  problem = null
}: AddTrackDialogProps) {
  const { t } = useI18n();
  const fieldId = useId();
  const messageId = useId();
  const field = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [invalid, setInvalid] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[]>([currentPlaylistId]);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  /* A fresh open resets the field and the selection, so a cancelled paste and
   * choice do not linger into the next open. */
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setUrl('');
      setInvalid(null);
      setChosen([currentPlaylistId]);
      setConfirmingDiscard(false);
    }
  }

  /* The server problem and the schema's own message share one slot, as the add
   * dialog's do: a person sees one field and one thing wrong with it. */
  const message = invalid ?? problem;

  useEffect(() => {
    setInvalid(null);
  }, [problem]);

  /* The refused playlists of a returned batch, which is what keeps the dialog
   * open; empty on no result and on an all-success batch. */
  const refusedIds =
    result === null
      ? []
      : result.results
          .filter(entry => entry.outcome === AddTrackOutcome.Refused)
          .map(entry => entry.playlistId);

  /* Whether every playlist in the batch refused, so the lead can say "nothing
   * was added". The denominator is the batch's own size, not the checkboxes. */
  const everyRefused =
    result !== null && refusedIds.length === result.results.length;

  const nameOf = (playlistId: string): string =>
    playlists.find(playlist => playlist.id === playlistId)?.name ?? playlistId;

  /* The playlist the dialog was opened from leads, so the preselection the
   * batch starts with is never buried under a long account's list. */
  const orderedPlaylists = [
    ...playlists.filter(playlist => playlist.id === currentPlaylistId),
    ...playlists.filter(playlist => playlist.id !== currentPlaylistId)
  ];

  const dirty = url.trim().length > 0;

  function requestClose(): void {
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

  const toggle = (playlistId: string): void => {
    setChosen(current =>
      current.includes(playlistId)
        ? current.filter(id => id !== playlistId)
        : [...current, playlistId]
    );
  };

  function submit(): void {
    if (isWorking || chosen.length === 0) {
      return;
    }

    const trimmed = url.trim();
    const parsed = AddTrackInputSchema.safeParse({
      url: trimmed,
      playlistIds: chosen
    });

    /* The schema checks it is a URL; a `list` parameter makes it a playlist
     * URL, which this dialog does not take, so the whole request is refused. */
    const isPlaylistUrl =
      parsed.success && new URL(parsed.data.url).searchParams.has('list');

    if (!parsed.success || isPlaylistUrl) {
      setInvalid(t('addTrackDialog.invalid'));
      return;
    }

    setInvalid(null);
    onSubmit(parsed.data.url, parsed.data.playlistIds);
  }

  return (
    <Dialog
      open={open}
      title={t('addTrackDialog.title')}
      description={t('addTrackDialog.description')}
      initialFocus={field}
      onRequestClose={requestClose}
      actions={
        confirmingDiscard ? (
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
              disabled={isWorking}
              onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              className={dialogStyles.dialog__primary}
              type="button"
              data-loading={isWorking ? 'true' : undefined}
              aria-busy={isWorking}
              disabled={isWorking || !dirty || chosen.length === 0}
              onClick={submit}>
              {isWorking ? (
                <>
                  <Spinner />
                  {t('addTrackDialog.adding')}
                </>
              ) : (
                t('addTrackDialog.add')
              )}
            </button>
          </>
        )
      }>
      {confirmingDiscard ? (
        <p className={dialogStyles.dialog__discard} role="alert">
          {t('common.discardPrompt')}
        </p>
      ) : null}
      {refusedIds.length > 0 ? (
        <div className={styles.addTrack__refused}>
          <p className={styles.addTrack__refusedLead}>
            {everyRefused
              ? t('addTrackDialog.refusedAll')
              : t('addTrackDialog.refusedSome')}
          </p>
          <ul className={styles.addTrack__refusedList}>
            {refusedIds.map(playlistId => (
              <li key={playlistId}>{nameOf(playlistId)}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div
        className={dialogStyles.field}
        data-invalid={message === null ? undefined : 'true'}
        data-disabled={isWorking ? 'true' : undefined}>
        <label className={dialogStyles.field__label} htmlFor={fieldId}>
          {t('addTrackDialog.videoLabel')}
        </label>
        <input
          ref={field}
          className={dialogStyles.field__input}
          id={fieldId}
          type="url"
          placeholder="https://youtube.com/watch?v=..."
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
      <ul className={styles.addTrack__pick}>
        {orderedPlaylists.map(playlist => (
          <li key={playlist.id}>
            <label
              className={styles.addTrack__row}
              data-current={playlist.id === currentPlaylistId || undefined}>
              <input
                className={styles.addTrack__box}
                type="checkbox"
                checked={chosen.includes(playlist.id)}
                disabled={isWorking}
                onChange={() => toggle(playlist.id)}
              />
              <span className={styles.addTrack__name}>{playlist.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
