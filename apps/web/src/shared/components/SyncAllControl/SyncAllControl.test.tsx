import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import SyncAllControl from './SyncAllControl';

/* The gallery's bulk action states its scope and locks while it works, so the
 * count in the label is the set it starts. */

function renderControl(props: Partial<Parameters<typeof SyncAllControl>[0]>) {
  return render(
    <I18nProvider preferred={['en']}>
      <SyncAllControl
        count={12}
        working={false}
        onPress={() => undefined}
        {...props}
      />
    </I18nProvider>
  );
}

describe('SyncAllControl', () => {
  it('states the size of the set it starts', () => {
    renderControl({ count: 12 });

    expect(
      screen.getByRole('button', { name: 'Sync all 12 playlists' })
    ).toBeEnabled();
  });

  it('drops the "all" for a set of one', () => {
    renderControl({ count: 1 });

    expect(
      screen.getByRole('button', { name: 'Sync 1 playlist' })
    ).toBeInTheDocument();
  });

  it('locks and reports the work while the loop runs', () => {
    renderControl({ count: 4, working: true });

    const control = screen.getByRole('button', {
      name: 'Syncing 4 playlists...'
    });

    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');
  });

  it('hands the press to the page', () => {
    const onPress = vi.fn();
    renderControl({ onPress });

    fireEvent.click(
      screen.getByRole('button', { name: 'Sync all 12 playlists' })
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
