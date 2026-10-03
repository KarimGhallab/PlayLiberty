import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import EmptyShelf from './EmptyShelf';

describe('EmptyShelf', () => {
  it('says there are no playlists and offers the add action', () => {
    render(<EmptyShelf onAdd={vi.fn()} />);

    expect(screen.getByText('No playlists yet')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add a playlist' })
    ).toBeInTheDocument();
  });

  it('does not offer the playlist sync action', () => {
    render(<EmptyShelf onAdd={vi.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Sync now' })
    ).not.toBeInTheDocument();
  });

  it('calls the add action when pressed', () => {
    const onAdd = vi.fn();
    render(<EmptyShelf onAdd={onAdd} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add a playlist' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { container } = render(<EmptyShelf onAdd={vi.fn()} />);

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
