import type { ReactNode } from 'react';

import styles from './ToastStack.module.scss';

/* The one corner the toasts share: bottom-left, above the player bar. */
export default function ToastStack({
  children
}: {
  readonly children: ReactNode;
}) {
  return <div className={styles.toasts}>{children}</div>;
}
