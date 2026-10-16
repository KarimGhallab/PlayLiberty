import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import { PlaylistSort } from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import PlaylistSortControl from './PlaylistSortControl';

/* The colour, the rule and the menu's motion are the stylesheet's business. */

function renderControl(
  props: Partial<Parameters<typeof PlaylistSortControl>[0]> = {}
) {
  return render(
    <I18nProvider preferred={['en']}>
      <PlaylistSortControl
        sort={PlaylistSort.Playlist}
        canEdit
        shuffled={false}
        onChange={vi.fn()}
        {...props}
      />
    </I18nProvider>
  );
}

describe('PlaylistSortControl', () => {
  it('draws the order the playlist is read in', () => {
    renderControl({ sort: PlaylistSort.NewestFirst });

    expect(
      screen.getByRole('button', { name: 'Sort by: Newest first' })
    ).toBeDefined();
  });

  it('opens the three orders and marks the one in force', () => {
    renderControl({ sort: PlaylistSort.OldestFirst });

    fireEvent.click(
      screen.getByRole('button', { name: 'Sort by: Oldest first' })
    );

    expect(
      screen.getByRole('option', { name: 'Oldest first' })
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('option', { name: 'Playlist order' })
    ).toHaveAttribute('aria-selected', 'false');
  });

  it('asks for the chosen order and closes the menu', () => {
    const onChange = vi.fn();
    renderControl({ sort: PlaylistSort.Playlist, onChange });

    fireEvent.click(
      screen.getByRole('button', { name: 'Sort by: Playlist order' })
    );
    fireEvent.click(screen.getByRole('option', { name: 'Newest first' }));

    expect(onChange).toHaveBeenCalledWith(PlaylistSort.NewestFirst);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('asks for nothing when the order already in force is picked', () => {
    const onChange = vi.fn();
    renderControl({ sort: PlaylistSort.Playlist, onChange });

    fireEvent.click(
      screen.getByRole('button', { name: 'Sort by: Playlist order' })
    );
    fireEvent.click(screen.getByRole('option', { name: 'Playlist order' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables the control while the shuffled list is the one on screen', () => {
    renderControl({ shuffled: true });

    expect(
      screen.getByRole('button', { name: 'Sort by: Playlist order' })
    ).toBeDisabled();
  });

  it('disables the control for a read collaborator', () => {
    renderControl({ canEdit: false });

    expect(
      screen.getByRole('button', { name: 'Sort by: Playlist order' })
    ).toBeDisabled();
  });

  it('locks the control while the server is answering', () => {
    renderControl({ saving: true });

    expect(
      screen.getByRole('button', { name: 'Sort by: Playlist order' })
    ).toBeDisabled();
  });

  it('has no axe violations', async () => {
    const { container } = renderControl();

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
