import { IconCircleCheck } from '@tabler/icons-react';

import Toast from './Toast';
import type { ToastProps } from './Toast';

type ResultToastProps = Omit<ToastProps, 'tone' | 'icon' | 'action' | 'ring'>;

export default function SuccessToast(props: ResultToastProps) {
  return (
    <Toast
      {...props}
      tone="success"
      icon={<IconCircleCheck focusable="false" />}
      ring={false}
    />
  );
}
