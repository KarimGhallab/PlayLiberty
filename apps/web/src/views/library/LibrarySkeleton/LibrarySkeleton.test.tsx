import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import LibrarySkeleton from './LibrarySkeleton';

describe('LibrarySkeleton', () => {
  it('announces loading once and keeps the shapes out of the tree', () => {
    const { container } = render(<LibrarySkeleton />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading playlists.');
    /* Five rows of shapes, every one of them hidden from assistive tech. */
    expect(container.querySelectorAll('[aria-hidden="true"] > *')).toHaveLength(
      5
    );
  });

  it('has no axe violations', async () => {
    const { container } = render(<LibrarySkeleton />);

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
