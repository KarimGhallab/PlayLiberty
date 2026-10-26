import ToastStack from '../Toast/ToastStack';
import type { DeferredWindow } from '../useDeferredAction/types';
import UndoToast from './UndoToast';

/*
 * Every open window gets its own toast, newest first. The stack only places
 * them; each toast owns its message, its cancel and its remaining time.
 */

interface UndoToastStackProps {
  readonly windows: readonly DeferredWindow[];
  readonly actionLabel: string;
  readonly onCancel: (key: number) => void;
}

export default function UndoToastStack({
  windows,
  actionLabel,
  onCancel
}: UndoToastStackProps) {
  if (windows.length === 0) {
    return null;
  }

  return (
    <ToastStack>
      {[...windows].reverse().map(entry => (
        <UndoToast
          key={entry.key}
          message={entry.message}
          detail={entry.detail}
          windowKey={entry.key}
          durationMs={Math.max(0, entry.expiresAt - Date.now())}
          actionLabel={actionLabel}
          onAction={() => onCancel(entry.key)}
          onDismiss={() => onCancel(entry.key)}
        />
      ))}
    </ToastStack>
  );
}
