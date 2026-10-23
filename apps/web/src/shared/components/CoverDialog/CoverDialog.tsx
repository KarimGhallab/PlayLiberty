import { IconPhoto } from '@tabler/icons-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import type { Playlist } from '@playliberty/contracts';
import { useI18n } from '@playliberty/i18n';
import { sleeveIndex } from '@playliberty/ui-foundation';

import type { CoverCrop, CropFraming } from '../../coverCrop/coverCrop';
import {
  clampPan,
  cropOf,
  formatZoom,
  maxZoom,
  shortEdge
} from '../../coverCrop/coverCrop';
import { usePlaylistCover } from '../../playlistCover/usePlaylistCover';
import Dialog from '../Dialog/Dialog';
import dialogStyles from '../Dialog/Dialog.module.scss';
import Spinner from '../Spinner/Spinner';
import styles from './CoverDialog.module.scss';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
const PAN_STEP = 0.05;
const ZOOM_STEP = 0.1;

interface Size {
  readonly width: number;
  readonly height: number;
}

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
 * One square is the whole cover surface: the current, chosen, or post-removal
 * image, with the labelled button below as its keyboard path. A chosen file
 * turns it into a crop stage; the server owns the bytes and the final square.
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
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [natural, setNatural] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
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
      setNatural(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
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
  const isStage = file !== null && previewFailed === false;
  const ready = isStage && natural !== null;
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

  const zoomMax = natural === null ? 1 : maxZoom(natural.width, natural.height);
  const adjusted = ready && (zoom !== 1 || pan.x !== 0 || pan.y !== 0);
  const zoomRatio = zoomMax === 1 ? 100 : ((zoom - 1) / (zoomMax - 1)) * 100;
  /* At 1x the short edge spans the stage, so the painted box is the source's
   * aspect with one side at 100%. */
  const edge = natural === null ? 1 : shortEdge(natural.width, natural.height);
  const stageWidth = natural === null ? 100 : (natural.width / edge) * 100;
  const stageHeight = natural === null ? 100 : (natural.height / edge) * 100;

  function framing(): CropFraming | null {
    if (natural === null) {
      return null;
    }

    return {
      naturalWidth: natural.width,
      naturalHeight: natural.height,
      zoom,
      panX: pan.x,
      panY: pan.y
    };
  }

  function applyZoom(next: number): void {
    if (natural === null) {
      return;
    }

    const stepped = Math.min(zoomMax, Math.max(1, next));
    const clamped = clampPan({
      naturalWidth: natural.width,
      naturalHeight: natural.height,
      zoom: stepped,
      panX: pan.x,
      panY: pan.y
    });

    setZoom(stepped);
    setPan({ x: clamped.panX, y: clamped.panY });
  }

  function panBy(deltaX: number, deltaY: number): void {
    if (natural === null) {
      return;
    }

    const clamped = clampPan({
      naturalWidth: natural.width,
      naturalHeight: natural.height,
      zoom,
      panX: pan.x + deltaX,
      panY: pan.y + deltaY
    });

    setPan({ x: clamped.panX, y: clamped.panY });
  }

  function resetCrop(): void {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

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
    setNatural(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
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

    const current = framing();

    onSubmit(file, adjusted && current !== null ? cropOf(current) : null);
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
              panBy(-PAN_STEP, 0);
              return;
            }

            if (event.key === 'ArrowRight') {
              event.preventDefault();
              panBy(PAN_STEP, 0);
              return;
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              panBy(0, -PAN_STEP);
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              panBy(0, PAN_STEP);
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
                transform: `translate(${pan.x * 100}%, ${pan.y * 100}%) scale(${zoom})`
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
                    setNatural({ width: naturalWidth, height: naturalHeight });
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
                aria-valuenow={zoom}
                aria-valuetext={formatZoom(zoom)}
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
                    applyZoom(zoom + ZOOM_STEP);
                    return;
                  }

                  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    applyZoom(zoom - ZOOM_STEP);
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
                {formatZoom(zoom)}
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
