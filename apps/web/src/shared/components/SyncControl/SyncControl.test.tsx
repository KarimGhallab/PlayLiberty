import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SyncControl from './SyncControl';

/* The control owns the shape and the lock; the caller owns the scope words. */
function renderControl(props: Partial<Parameters<typeof SyncControl>[0]>) {
  return render(
    <SyncControl
      label="Sync all 12 playlists"
      workingLabel="Syncing 12 playlists..."
      working={false}
      onPress={() => undefined}
      {...props}
    />
  );
}

describe('SyncControl', () => {
  it('locks and reports the work while the run is in flight', () => {
    renderControl({ working: true });

    const control = screen.getByRole('button', {
      name: 'Syncing 12 playlists...'
    });

    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');
  });

  it('locks without claiming work when the caller disables it', () => {
    renderControl({ disabled: true });

    const control = screen.getByRole('button', {
      name: 'Sync all 12 playlists'
    });

    expect(control).toBeDisabled();
    expect(control).not.toHaveAttribute('aria-busy');
  });

  it('hands the press to the caller', () => {
    const onPress = vi.fn();
    renderControl({ onPress });

    fireEvent.click(
      screen.getByRole('button', { name: 'Sync all 12 playlists' })
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
