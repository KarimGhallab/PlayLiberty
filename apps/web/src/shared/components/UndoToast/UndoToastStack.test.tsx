import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import type { DeferredWindow } from '../useDeferredAction/types';
import UndoToastStack from './UndoToastStack';

function deferredWindow(key: number, detail: string): DeferredWindow {
  return {
    key,
    id: detail,
    message: 'Deleting playlist',
    detail,
    expiresAt: Date.now() + 6000
  };
}

function renderStack(
  windows: readonly DeferredWindow[],
  onCancel = vi.fn()
) {
  render(
    <I18nProvider preferred={['en']}>
      <UndoToastStack
        windows={windows}
        actionLabel="Cancel"
        onCancel={onCancel}
      />
    </I18nProvider>
  );

  return { onCancel };
}

describe('UndoToastStack', () => {
  it('draws every window with the newest above the older', () => {
    renderStack([
      deferredWindow(1, 'Rain On The Window'),
      deferredWindow(2, 'Night Bus')
    ]);

    const toasts = screen.getAllByRole('status');

    expect(toasts).toHaveLength(2);
    expect(toasts[0]).toHaveTextContent('Night Bus');
    expect(toasts[1]).toHaveTextContent('Rain On The Window');
  });

  it('cancels the window whose toast owns the press', () => {
    const { onCancel } = renderStack([
      deferredWindow(1, 'Rain On The Window'),
      deferredWindow(2, 'Night Bus')
    ]);

    const [newest] = screen.getAllByRole('status');
    fireEvent.click(within(newest).getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledWith(2);
  });
});
