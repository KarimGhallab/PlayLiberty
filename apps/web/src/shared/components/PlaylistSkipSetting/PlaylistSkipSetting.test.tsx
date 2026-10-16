import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import PlaylistSkipSetting from './PlaylistSkipSetting';

/* The colour and the thumb are the stylesheet's business. */

function renderSetting(
  props: Partial<Parameters<typeof PlaylistSkipSetting>[0]> = {}
) {
  return render(
    <I18nProvider preferred={['en']}>
      <PlaylistSkipSetting skipNonMusic canEdit onChange={vi.fn()} {...props} />
    </I18nProvider>
  );
}

describe('PlaylistSkipSetting', () => {
  it('is a switch named by its label and on when the playlist skips', () => {
    renderSetting();

    expect(
      screen.getByRole('switch', { name: 'Skip non-music parts' })
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('reads off when the playlist keeps the whole audio', () => {
    renderSetting({ skipNonMusic: false });

    expect(
      screen.getByRole('switch', { name: 'Skip non-music parts' })
    ).toHaveAttribute('aria-checked', 'false');
  });

  it('asks for the opposite value on a press', () => {
    const onChange = vi.fn();
    renderSetting({ skipNonMusic: true, onChange });

    fireEvent.click(
      screen.getByRole('switch', { name: 'Skip non-music parts' })
    );

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('disables the switch for a read collaborator', () => {
    renderSetting({ canEdit: false });

    expect(
      screen.getByRole('switch', { name: 'Skip non-music parts' })
    ).toBeDisabled();
  });

  it('locks the switch while the server is answering', () => {
    renderSetting({ saving: true });

    expect(
      screen.getByRole('switch', { name: 'Skip non-music parts' })
    ).toBeDisabled();
  });

  it('has no axe violations', async () => {
    const { container } = renderSetting();

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
