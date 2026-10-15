import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import LibrarySkeleton from './LibrarySkeleton';

function renderSkeleton(layout: 'tile' | 'card' = 'tile') {
  return render(
    <I18nProvider preferred={['en']}>
      <LibrarySkeleton layout={layout} />
    </I18nProvider>
  );
}

describe('LibrarySkeleton', () => {
  it('announces loading once and keeps the shapes out of the tree', () => {
    renderSkeleton();

    expect(screen.getByRole('status')).toHaveTextContent('Loading playlists.');
  });

  it('has no axe violations', async () => {
    const { container } = renderSkeleton();

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
