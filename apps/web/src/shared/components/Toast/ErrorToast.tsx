import { IconAlertTriangle } from '@tabler/icons-react';

import Toast from './Toast';
import type { ToastProps } from './Toast';

type ResultToastProps = Omit<ToastProps, 'tone' | 'icon' | 'action' | 'ring'>;

export default function ErrorToast(props: ResultToastProps) {
  return (
    <Toast
      {...props}
      tone="failed"
      icon={<IconAlertTriangle focusable="false" />}
      ring={false}
    />
  );
}
