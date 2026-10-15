import { useEffect, useId, useRef, useState } from 'react';

import { AddTrackInputSchema, AddTrackOutcome } from '@playliberty/contracts';
import type { AddTrackResult, Playlist } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';

import Dialog from '../Dialog/Dialog';
import dialogStyles from '../Dialog/Dialog.module.scss';
import styles from './AddTrackDialog.module.scss';

/*
 * The add-a-track dialog, and the playlist detail's only door for one pasted
 * video. It takes a video URL and a set of writable playlists, and it is one
 * request for the whole batch: `POST /tracks` resolves the video once and answers
 * one outcome per chosen playlist. It is named for the track and its field takes
 * a video URL, which is the glossary's own distinction: a track is what the
 * server stores, a video is its source on YouTube.
 *
 * The body is the writable playlists, and the playlist being looked at arrives
 * checked, so the common case is one press. A playlist the account cannot write
 * to is absent rather than disabled, the screen's own rule; the caller has
 * already filtered to `owner` and `write`, and this component never offers a
 * control that cannot be pressed.
 *
 * The dialog is two surfaces. Choosing playlists and reporting a refusal are the
 * same node, so the title and the field do not move and only the block under the
 * list changes. It closes on an all-success outcome, where there is nothing to
 * read, and stays open on any `refused`, naming the playlists that refused. The
 * refusal carries no cause: the route withholds it on purpose so the batch cannot
 * enumerate other accounts' playlists, and the copy is about the outcome and not
 * the reason.
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
  const [wasOpen, setWasOpen] = useState(open);

  /*
   * A fresh dialog opens on an empty field and only the current playlist checked,
   * so a cancelled paste and a cancelled choice do not linger into the next open.
   */
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setUrl('');
      setInvalid(null);
      setChosen([currentPlaylistId]);
    }
  }

  /* The server problem and the schema's own message share one slot, as the add
   * dialog's do: a person sees one field and one thing wrong with it. */
  const message = invalid ?? problem;

  useEffect(() => {
    setInvalid(null);
  }, [problem]);

  /*
   * The refused playlists of a returned batch, which is what keeps the dialog
   * open. Empty while there is no result and empty on an all-success batch, so
   * the block draws only when something refused.
   */
  const refusedIds =
    result === null
      ? []
      : result.results
          .filter(entry => entry.outcome === AddTrackOutcome.Refused)
          .map(entry => entry.playlistId);

  /* Whether every playlist in the batch refused, so the lead can say "nothing
   * was added" rather than "added to the rest". The denominator is the batch's
   * own size, not the checkboxes on screen, which can have been changed since. */
  const everyRefused =
    result !== null && refusedIds.length === result.results.length;

  const nameOf = (playlistId: string): string =>
    playlists.find(playlist => playlist.id === playlistId)?.name ?? playlistId;

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

    /*
     * The schema checks that it is a URL; the video check is this dialog's own,
     * the same half the add dialog does for a playlist. A `list` parameter is a
     * playlist URL, which "add a track" does not take, and the whole request is
     * refused so no playlist is touched. The server makes the same check, and
     * this is the client's half of it in one slot.
     */
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
                {t('addTrackDialog.adding')}
              </>
            ) : (
              t('addTrackDialog.add')
            )}
          </button>
        </>
      }>
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
        {playlists.map(playlist => (
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
