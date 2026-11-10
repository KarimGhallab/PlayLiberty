import { IconPhoto } from '@tabler/icons-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useId, useReducer, useRef, useState } from 'react';

import type { Playlist } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';
import type { CoverCrop } from '@playliberty/ui-foundation';
import {
  COVER_ACCEPTED_TYPES,
  COVER_PAN_STEP,
  COVER_ZOOM_STEP,
  coverUploadAdjusted,
  coverUploadBox,
  coverUploadInitial,
  coverUploadStageReady,
  coverUploadSubmission,
  coverUploadVerdict,
  coverUploadZoomMax,
  coverUploadZoomRatio,
  formatZoom,
  reduceCoverUpload,
  sleeveIndex
} from '@playliberty/ui-foundation';

import { usePlaylistCover } from '../../usePlaylistCover';
import Dialog from '../Dialog/Dialog';
import dialogStyles from '../Dialog/Dialog.module.scss';
import Spinner from '../Spinner/Spinner';
import styles from './CoverDialog.module.scss';

interface CoverDialogProps {
  readonly open: boolean;
  readonly playlist: Playlist;
  readonly onSubmit: (file: File, crop: CoverCrop | null) => void;
  readonly onRemove?: () => void;
  readonly onClose: () => void;
  readonly onClosed?: () => void;
  readonly isWorking?: boolean;
  readonly isRemoving?: boolean;
  readonly problem?: string | null;
  readonly removeProblem?: string | null;
}

/*
 * One square is the whole cover surface, with the labelled button as its
 * keyboard path; a chosen file turns it into a crop stage the server normalises.
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
  const hintId = useId();
  const zoomLabelId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const stageElement = useRef<HTMLDivElement>(null);
  const zoomRail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const zooming = useRef(false);
  const [state, dispatch] = useReducer(
    reduceCoverUpload<File>,
    coverUploadInitial<File>()
  );
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { chosen, verdict, confirmingDiscard, confirmingRemove } = state;
  const { cover: currentCover, onCoverError } = usePlaylistCover(playlist);
  const { cover: replacementCover, onCoverError: onReplacementError } =
    usePlaylistCover(playlist, false);

  useEffect(() => {
    if (!open) {
      return;
    }

    dispatch({ type: 'reset' });
    setPreviewUrl(null);
    setPreviewFailed(false);
    setDragging(false);
  }, [open]);

  useEffect(() => {
    if (previewUrl === null) {
      return;
    }

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const busy = isWorking || isRemoving;

  useEffect(() => {
    dispatch({ type: 'busy', busy });
  }, [busy]);

  useEffect(() => {
    if (!state.closeRequested) {
      return;
    }

    closeRef.current();
    dispatch({ type: 'closed' });
  }, [state.closeRequested]);

  const canRemove = onRemove !== undefined && playlist.coverUpdatedAt !== null;
  const message =
    verdict === null
      ? confirmingRemove
        ? removeProblem
        : problem
      : t(
          verdict === 'wrong-type'
            ? 'coverDialog.wrongType'
            : 'coverDialog.tooLarge'
        );
  const isStage = chosen !== null && previewFailed === false;
  const ready = coverUploadStageReady(state) && previewFailed === false;
  const source = confirmingRemove
    ? replacementCover
    : chosen === null
      ? currentCover
      : previewFailed
        ? null
        : previewUrl;
  const onImageError = confirmingRemove
    ? onReplacementError
    : chosen === null
      ? onCoverError
      : () => setPreviewFailed(true);

  const zoomMax = coverUploadZoomMax(state);
  const adjusted = coverUploadAdjusted(state);
  const zoomRatio = coverUploadZoomRatio(state);
  const box = coverUploadBox(state);
  /* At 1x the short edge spans the stage, so the painted box is the source's
   * aspect with one side at 100%. */
  const stageWidth = box === null ? 100 : box.width * 100;
  const stageHeight = box === null ? 100 : box.height * 100;

  function applyZoom(next: number): void {
    dispatch({ type: 'zoomTo', zoom: next });
  }

  function panBy(deltaX: number, deltaY: number): void {
    dispatch({ type: 'panBy', x: deltaX, y: deltaY });
  }

  function resetCrop(): void {
    dispatch({ type: 'resetCrop' });
  }

  function selectFile(selected: File): void {
    if (busy) {
      return;
    }

    const descriptor = {
      file: selected,
      contentType: selected.type,
      size: selected.size
    };

    if (coverUploadVerdict(descriptor) === null) {
      setPreviewUrl(URL.createObjectURL(selected));
      setPreviewFailed(false);
    }

    dispatch({ type: 'choose', file: descriptor });
  }

  function requestClose(): void {
    if (busy) {
      return;
    }

    dispatch({ type: 'requestClose' });
  }

  function submit(): void {
    if (busy) {
      return;
    }

    const submission = coverUploadSubmission(state);

    if (submission === null) {
      return;
    }

    onSubmit(submission.file.file, submission.crop);
  }

  function zoomAt(clientX: number): void {
    const rail = zoomRail.current?.getBoundingClientRect();

    if (rail === undefined || rail.width === 0) {
      return;
    }

    const ratio = Math.min(1, Math.max(0, (clientX - rail.left) / rail.width));

    applyZoom(1 + (zoomMax - 1) * ratio);
  }

  function startPan(event: ReactPointerEvent<HTMLDivElement>): void {
    if (busy || !ready) {
      return;
    }

    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>): void {
    const current = drag.current;
    const box = stageElement.current?.getBoundingClientRect();

    if (
      current === null ||
      current.pointerId !== event.pointerId ||
      box === undefined ||
      box.width === 0 ||
      box.height === 0
    ) {
      return;
    }

    panBy(
      (event.clientX - current.x) / box.width,
      (event.clientY - current.y) / box.height
    );
    drag.current = {
      pointerId: current.pointerId,
      x: event.clientX,
      y: event.clientY
    };
  }

  function endPan(event: ReactPointerEvent<HTMLDivElement>): void {
    if (drag.current?.pointerId !== event.pointerId) {
      return;
    }

    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
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
              onClick={() => dispatch({ type: 'cancelRemove' })}>
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
              onClick={() => dispatch({ type: 'cancelDiscard' })}>
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
              disabled={busy || chosen === null}
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
          ref={stageElement}
          className={styles.cover__square}
          data-cover-drop
          data-art={source === null ? 'no-art' : 'art'}
          data-stage={ready ? 'true' : undefined}
          data-dragging={dragging ? 'true' : undefined}
          data-sleeve={source === null ? sleeveIndex(playlist.id) : undefined}
          role={ready ? 'group' : undefined}
          tabIndex={ready ? 0 : undefined}
          aria-hidden={ready ? undefined : 'true'}
          aria-describedby={ready ? hintId : undefined}
          onKeyDown={event => {
            if (!ready) {
              return;
            }

            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              panBy(-COVER_PAN_STEP, 0);
              return;
            }

            if (event.key === 'ArrowRight') {
              event.preventDefault();
              panBy(COVER_PAN_STEP, 0);
              return;
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              panBy(0, -COVER_PAN_STEP);
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              panBy(0, COVER_PAN_STEP);
            }
          }}
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
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
          ) : isStage ? (
            <span
              className={styles.cover__stage}
              style={{
                transform: `translate(${state.panX * 100}%, ${state.panY * 100}%) scale(${state.zoom})`
              }}>
              <img
                className={styles.cover__stageImage}
                src={source}
                alt=""
                draggable={false}
                decoding="async"
                style={{
                  width: `${stageWidth}%`,
                  height: `${stageHeight}%`
                }}
                onLoad={event => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;

                  if (naturalWidth > 0 && naturalHeight > 0) {
                    dispatch({
                      type: 'measured',
                      size: { width: naturalWidth, height: naturalHeight }
                    });
                  }
                }}
                onError={onImageError}
              />
            </span>
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
          accept={COVER_ACCEPTED_TYPES.join(',')}
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
        {ready ? (
          <div className={styles.cover__controls}>
            <p className={styles.cover__hintLine} id={hintId}>
              {t('coverDialog.cropHint')}
            </p>
            <div className={styles.cover__zoom}>
              <span className={styles.cover__zoomLabel} id={zoomLabelId}>
                {t('coverDialog.zoom')}
              </span>
              <div
                ref={zoomRail}
                className={styles.cover__zoomTrack}
                role="slider"
                tabIndex={0}
                aria-labelledby={zoomLabelId}
                aria-orientation="horizontal"
                aria-valuemin={1}
                aria-valuemax={zoomMax}
                aria-valuenow={state.zoom}
                aria-valuetext={formatZoom(state.zoom)}
                onPointerDown={event => {
                  zooming.current = true;
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                  zoomAt(event.clientX);
                }}
                onPointerMove={event => {
                  if (zooming.current) {
                    zoomAt(event.clientX);
                  }
                }}
                onPointerUp={event => {
                  zooming.current = false;
                  event.currentTarget.releasePointerCapture?.(event.pointerId);
                }}
                onPointerCancel={event => {
                  zooming.current = false;
                  event.currentTarget.releasePointerCapture?.(event.pointerId);
                }}
                onKeyDown={event => {
                  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    applyZoom(state.zoom + COVER_ZOOM_STEP);
                    return;
                  }

                  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    applyZoom(state.zoom - COVER_ZOOM_STEP);
                  }
                }}>
                <span
                  className={styles.cover__zoomFill}
                  style={{ width: `${zoomRatio}%` }}
                />
                <span
                  className={styles.cover__zoomKnob}
                  style={{ left: `${zoomRatio}%` }}
                />
              </div>
              <span className={styles.cover__zoomValue}>
                {formatZoom(state.zoom)}
              </span>
            </div>
            <button
              className={styles.cover__reset}
              type="button"
              disabled={!adjusted}
              onClick={resetCrop}>
              {t('coverDialog.reset')}
            </button>
          </div>
        ) : null}
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
            onClick={() => dispatch({ type: 'requestRemove' })}>
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
