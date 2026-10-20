import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import EmptyGallery from './EmptyGallery';

function renderGallery(onAdd: () => void) {
  return render(
    <I18nProvider preferred={['en']}>
      <EmptyGallery onAdd={onAdd} />
    </I18nProvider>
  );
}

describe('EmptyGallery', () => {
  it('says there are no playlists and offers the add action', () => {
    renderGallery(vi.fn());

    expect(screen.getByText('No playlists yet')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add a playlist' })
    ).toBeInTheDocument();
  });

  it('does not offer the playlist sync action', () => {
    renderGallery(vi.fn());

    expect(
      screen.queryByRole('button', { name: 'Sync' })
    ).not.toBeInTheDocument();
  });

  it('calls the add action when pressed', () => {
    const onAdd = vi.fn();
    renderGallery(onAdd);

    fireEvent.click(screen.getByRole('button', { name: 'Add a playlist' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { container } = renderGallery(vi.fn());

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
