import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import {
  Provider,
  REMOTE_REMOVED,
  TrackFileStatus
} from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import PlaylistFilterChips from './PlaylistFilterChips';

/* The colours and the sideways scroll are the stylesheet's business. */

const COUNTS: TrackFileStatusCounts = {
  stored: 2,
  pending: 1,
  downloading: 0,
  failed: 0,
  unavailable: 0
};

function renderChips(
  props: Partial<Parameters<typeof PlaylistFilterChips>[0]> = {}
) {
  return render(
    <I18nProvider preferred={['en']}>
      <PlaylistFilterChips
        counts={COUNTS}
        remoteRemoved={0}
        provider={Provider.Youtube}
        active={null}
        onChange={vi.fn()}
        {...props}
      />
    </I18nProvider>
  );
}

describe('PlaylistFilterChips', () => {
  it('draws every state with its whole-playlist count, and All as the total', () => {
    renderChips();

    expect(screen.getByRole('button', { name: 'All 3' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Stored 2' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Pending 1' })).toBeDefined();
    /* A zero is drawn as well: the count is what the choice is made on. */
    expect(screen.getByRole('button', { name: 'Downloading 0' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Failed 0' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Unavailable 0' })).toBeDefined();
  });

  it('names All as the caller asks where another All is on screen', () => {
    renderChips({ allLabelKey: 'library.allTracks' });

    expect(screen.getByRole('button', { name: 'All tracks 3' })).toBeDefined();
    expect(
      screen.queryByRole('button', { name: 'All 3' })
    ).not.toBeInTheDocument();
  });

  it('offers only the statuses the counts carry when the caller asks', () => {
    renderChips({ showEmpty: false });

    expect(screen.getByRole('button', { name: 'All 3' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Stored 2' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Pending 1' })).toBeDefined();
    expect(
      screen.queryByRole('button', { name: 'Downloading 0' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Failed 0' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Unavailable 0' })
    ).not.toBeInTheDocument();
  });

  it('draws the retained view last, hidden at zero', () => {
    const { unmount } = renderChips({ remoteRemoved: 2 });
    const chips = screen.getAllByRole('button');

    expect(chips.at(-1)).toHaveAttribute(
      'aria-label',
      'Removed from YouTube 2'
    );

    unmount();
    renderChips();

    expect(
      screen.queryByRole('button', { name: /Removed from/ })
    ).not.toBeInTheDocument();
  });

  it('asks for the retained view on a press', () => {
    const onChange = vi.fn();
    renderChips({ remoteRemoved: 2, onChange });

    fireEvent.click(
      screen.getByRole('button', { name: 'Removed from YouTube 2' })
    );

    expect(onChange).toHaveBeenCalledWith(REMOTE_REMOVED);
  });

  it('marks the retained chip in force', () => {
    renderChips({ remoteRemoved: 2, active: REMOTE_REMOVED });

    expect(
      screen.getByRole('button', { name: 'Removed from YouTube 2' })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks the chip in force and asks for a state on a press', () => {
    const onChange = vi.fn();
    renderChips({ active: TrackFileStatus.Pending, onChange });

    expect(screen.getByRole('button', { name: 'Pending 1' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'All 3' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Failed 0' }));

    expect(onChange).toHaveBeenCalledWith(TrackFileStatus.Failed);
  });

  it('asks for All when All is pressed', () => {
    const onChange = vi.fn();
    renderChips({ active: TrackFileStatus.Stored, onChange });

    fireEvent.click(screen.getByRole('button', { name: 'All 3' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('asks for nothing when the chip already in force is pressed', () => {
    const onChange = vi.fn();
    renderChips({ active: TrackFileStatus.Stored, onChange });

    fireEvent.click(screen.getByRole('button', { name: 'Stored 2' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables every chip while the shuffled list is on screen', () => {
    renderChips({ disabled: true });

    for (const chip of screen.getAllByRole('button')) {
      expect(chip).toBeDisabled();
    }
  });

  it('has no axe violations', async () => {
    const { container } = renderChips({ remoteRemoved: 2 });

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
