import Toast from '../Toast/Toast';

/*
 * The deferred action's surface: an action the server has not yet been asked to
 * perform, with the one control that stops it. It composes the shared Toast
 * with the Undo action.
 */

interface UndoToastProps {
  /** The sentence, in the present tense, e.g. `Deleting “Evening Jazz”`. */
  readonly message: string;
  readonly detail?: string | null;
  readonly windowKey?: number;
  /** How long this window has left, in milliseconds. Drives the ring. */
  readonly durationMs: number;
  /** The control's own word, `Cancel` or `Undo`. */
  readonly actionLabel: string;
  readonly onAction: () => void;
  readonly onDismiss: () => void;
}

export default function UndoToast({
  message,
  detail = null,
  windowKey = 0,
  durationMs,
  actionLabel,
  onAction,
  onDismiss
}: UndoToastProps) {
  return (
    <Toast
      message={message}
      detail={detail}
      windowKey={windowKey}
      durationMs={durationMs}
      action={{ label: actionLabel, onAction }}
      onDismiss={onDismiss}
    />
  );
}
