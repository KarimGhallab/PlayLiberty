import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  AssociationOrigin,
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import type { PlaylistTrack } from '@playliberty/contracts';

import TrackRow from './TrackRow';

function association(
  overrides: Partial<PlaylistTrack['track']> = {}
): PlaylistTrack {
  return {
    track: {
      id: 'track-1',
      provider: Provider.Youtube,
      videoId: 'video-1',
      title: 'Blue In Green',
      durationSeconds: 337,
      thumbnailPath: null,
      fileStatus: TrackFileStatus.Stored,
      sourceStatus: TrackSourceStatus.Available,
      failureReason: null,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      ...overrides
    },
    origin: AssociationOrigin.Remote,
    position: 0
  };
}

function renderRow(options: {
  readonly association?: PlaylistTrack;
  readonly current?: boolean;
  readonly playing?: boolean;
}): { onPlay: ReturnType<typeof vi.fn> } {
  const onPlay = vi.fn();

  render(
    <ul>
      <TrackRow
        association={options.association ?? association()}
        current={options.current ?? false}
        playing={options.playing ?? false}
        onPlay={onPlay}
      />
    </ul>
  );

  return { onPlay };
}

describe('TrackRow', () => {
  it('offers a play control for a stored track and starts there', () => {
    const { onPlay } = renderRow({});

    fireEvent.click(screen.getByRole('button', { name: 'Play Blue In Green' }));

    expect(onPlay).toHaveBeenCalledWith('track-1');
  });

  it('offers no play control for a track whose file is not stored', () => {
    renderRow({
      association: association({ fileStatus: TrackFileStatus.Pending })
    });

    expect(screen.getByText('Blue In Green')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Play Blue In Green' })
    ).not.toBeInTheDocument();
  });

  it('says nothing for a stored track that is still available', () => {
    renderRow({});

    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });

  it('names each state and carries the failure reason as a sentence', () => {
    renderRow({
      association: association({
        fileStatus: TrackFileStatus.Failed,
        failureReason: 'Download failed, will retry on the next sync'
      })
    });

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(
      screen.getByText('Download failed, will retry on the next sync')
    ).toBeInTheDocument();
  });

  it('keeps a removed track playable and says it is still here', () => {
    const { onPlay } = renderRow({
      association: association({ sourceStatus: TrackSourceStatus.Removed })
    });

    expect(screen.getByText('Removed, still here')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play Blue In Green' }));
    expect(onPlay).toHaveBeenCalledWith('track-1');
  });

  it('marks the current track with the resting morph state', () => {
    renderRow({ current: true, playing: true });

    expect(screen.getByRole('listitem')).toHaveAttribute(
      'data-state',
      'playing'
    );
  });

  it('shows a placeholder rather than a zero when the duration is unknown', () => {
    renderRow({ association: association({ durationSeconds: null }) });

    expect(screen.getByText('--:--')).toBeInTheDocument();
  });
});
