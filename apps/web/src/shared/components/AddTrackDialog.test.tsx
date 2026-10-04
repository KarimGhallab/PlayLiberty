import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import {
  AddTrackOutcome,
  PlaylistSyncStatus,
  Provider,
  ShareLevel
} from '@playliberty/contracts';
import type { Playlist } from '@playliberty/contracts';

import AddTrackDialog from './AddTrackDialog';

function playlist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'playlist-1',
    ownerAccountId: 'account-1',
    name: 'Rain On The Window',
    coverUrl: null,
    provider: Provider.Youtube,
    sourcePlaylistId: 'PL-demo',
    syncStatus: PlaylistSyncStatus.Idle,
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 3,
    access: 'owner',
    hasShares: false,
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

describe('AddTrackDialog', () => {
  it('opens on the video field with only the current playlist checked', () => {
    render(
      <AddTrackDialog
        open
        currentPlaylistId="playlist-1"
        playlists={PLAYLISTS}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

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
    render(
      <AddTrackDialog
        open
        currentPlaylistId="playlist-1"
        playlists={PLAYLISTS}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

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
    render(
      <AddTrackDialog
        open
        currentPlaylistId="playlist-1"
        playlists={PLAYLISTS}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Video link'), {
      target: { value: 'https://youtube.com/playlist?list=PL-demo' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('names the refused playlists and claims no cause', async () => {
    render(
      <AddTrackDialog
        open
        currentPlaylistId="playlist-1"
        playlists={PLAYLISTS}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        result={{
          results: [
            { playlistId: 'playlist-1', outcome: AddTrackOutcome.Added },
            { playlistId: 'playlist-3', outcome: AddTrackOutcome.Refused }
          ]
        }}
      />
    );

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
    render(
      <AddTrackDialog
        open
        currentPlaylistId="playlist-1"
        playlists={PLAYLISTS}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        result={{
          results: [
            { playlistId: 'playlist-1', outcome: AddTrackOutcome.Refused }
          ]
        }}
      />
    );

    expect(
      screen.getByText('Nothing was added. Not added to:')
    ).toBeInTheDocument();
  });

  it('shows no refusal block for an all-success batch', () => {
    render(
      <AddTrackDialog
        open
        currentPlaylistId="playlist-1"
        playlists={PLAYLISTS}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        result={{
          results: [
            { playlistId: 'playlist-1', outcome: AddTrackOutcome.Added },
            {
              playlistId: 'playlist-2',
              outcome: AddTrackOutcome.AlreadyPresent
            }
          ]
        }}
      />
    );

    expect(screen.queryByText(/Not added to/)).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <AddTrackDialog
        open
        currentPlaylistId="playlist-1"
        playlists={PLAYLISTS}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
