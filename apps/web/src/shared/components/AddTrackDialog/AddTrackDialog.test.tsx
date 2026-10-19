import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import {
  AddTrackOutcome,
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  ShareLevel
} from '@playliberty/contracts';
import type { Playlist } from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import AddTrackDialog from './AddTrackDialog';

function playlist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'playlist-1',
    ownerAccountId: 'account-1',
    name: 'Rain On The Window',
    coverTrackId: null,
    provider: Provider.Youtube,
    sourcePlaylistId: 'PL-demo',
    syncStatus: PlaylistSyncStatus.Idle,
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 3,
    skipNonMusic: true,
    sort: PlaylistSort.Playlist,
    access: 'owner',
    hasShares: false,
    pinned: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z',
    ...overrides
  };
}

const PLAYLISTS = [
  playlist({ id: 'playlist-1', name: 'Rain On The Window' }),
  playlist({ id: 'playlist-2', name: 'Late Night Jazz' }),
  playlist({
    id: 'playlist-3',
    name: 'Ada\u2019s Running Mix',
    access: ShareLevel.Write
  })
];

function renderDialog(
  props: Partial<Parameters<typeof AddTrackDialog>[0]> = {}
) {
  return render(
    <I18nProvider preferred={['en']}>
      <AddTrackDialog
        open
        currentPlaylistId="playlist-1"
        playlists={PLAYLISTS}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        {...props}
      />
    </I18nProvider>
  );
}

describe('AddTrackDialog', () => {
  it('opens on the video field with only the current playlist checked', () => {
    renderDialog();

    expect(
      screen.getByRole('dialog', { name: 'Add a track' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Video link')).toHaveFocus();
    expect(
      screen.getByRole('checkbox', { name: 'Rain On The Window' })
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Late Night Jazz' })
    ).not.toBeChecked();
  });

  it('submits the video and every chosen playlist as one batch', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    fireEvent.change(screen.getByLabelText('Video link'), {
      target: { value: '  https://youtube.com/watch?v=dQw4w9WgXcQ  ' }
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Late Night Jazz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).toHaveBeenCalledWith(
      'https://youtube.com/watch?v=dQw4w9WgXcQ',
      ['playlist-1', 'playlist-2']
    );
  });

  it('refuses a playlist URL with the schema and makes no request', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });

    fireEvent.change(screen.getByLabelText('Video link'), {
      target: { value: 'https://youtube.com/playlist?list=PL-demo' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('holds Add until a link and a playlist are present', () => {
    const onSubmit = vi.fn();
    renderDialog({ onSubmit });
    const add = screen.getByRole('button', { name: 'Add' });

    expect(add).toBeDisabled();
    fireEvent.click(add);
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Video link'), {
      target: { value: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }
    });
    expect(add).toBeEnabled();

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Rain On The Window' })
    );
    expect(add).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Late Night Jazz' }));
    expect(add).toBeEnabled();
  });

  it('asks before a dirty scrim click discards the link', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    const field = screen.getByLabelText('Video link');

    fireEvent.change(field, {
      target: { value: 'https://youtube.com/watch?v=dQw4w9WgXcQ' }
    });
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Discard this link?');

    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(field).toHaveValue('https://youtube.com/watch?v=dQw4w9WgXcQ');

    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('names the refused playlists and claims no cause', async () => {
    renderDialog({
      result: {
        results: [
          { playlistId: 'playlist-1', outcome: AddTrackOutcome.Added },
          { playlistId: 'playlist-3', outcome: AddTrackOutcome.Refused }
        ]
      }
    });

    expect(
      await screen.findByText(/Added to the rest\. Not added to:/)
    ).toBeInTheDocument();
    /* The name appears in the checklist too, so the refusal's own list is what
     * is asserted, by its role list and the item inside it. */
    const refusalList = screen
      .getByText(/Added to the rest\. Not added to:/)
      .parentElement?.querySelector('ul');
    expect(refusalList).toHaveTextContent('Ada\u2019s Running Mix');
  });

  it('says nothing was added when every playlist refused', () => {
    renderDialog({
      result: {
        results: [
          { playlistId: 'playlist-1', outcome: AddTrackOutcome.Refused }
        ]
      }
    });

    expect(
      screen.getByText('Nothing was added. Not added to:')
    ).toBeInTheDocument();
  });

  it('shows no refusal block for an all-success batch', () => {
    renderDialog({
      result: {
        results: [
          { playlistId: 'playlist-1', outcome: AddTrackOutcome.Added },
          {
            playlistId: 'playlist-2',
            outcome: AddTrackOutcome.AlreadyPresent
          }
        ]
      }
    });

    expect(screen.queryByText(/Not added to/)).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderDialog();

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
