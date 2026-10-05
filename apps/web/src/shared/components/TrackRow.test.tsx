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
      skipNonMusic: true,
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
  readonly onRetry?: (trackId: string) => void;
  readonly onFetchWhole?: (trackId: string) => void;
  readonly onRemove?: ((trackId: string) => void) | null;
  readonly busy?: boolean;
}): {
  onPlay: ReturnType<typeof vi.fn>;
  onRemove: ReturnType<typeof vi.fn>;
  unmount: () => void;
} {
  const onPlay = vi.fn();
  const onRemove = vi.fn();
  const resolvedRemove =
    options.onRemove === null ? undefined : (options.onRemove ?? onRemove);

  const { unmount } = render(
    <ul>
      <TrackRow
        association={options.association ?? association()}
        current={options.current ?? false}
        playing={options.playing ?? false}
        onPlay={onPlay}
        onRetry={options.onRetry}
        onFetchWhole={options.onFetchWhole}
        onRemove={resolvedRemove}
        busy={options.busy ?? false}
      />
    </ul>
  );

  return { onPlay, onRemove, unmount };
}

describe('TrackRow', () => {
  it('plays the track when the row is pressed', () => {
    const { onPlay } = renderRow({});

    fireEvent.click(screen.getByRole('button', { name: 'Play Blue In Green' }));

    expect(onPlay).toHaveBeenCalledWith('track-1');
  });

  it('labels the row as a pause when it is the track playing', () => {
    renderRow({ current: true, playing: true });

    expect(
      screen.getByRole('button', { name: 'Pause Blue In Green' })
    ).toBeInTheDocument();
  });

  it('offers the play layer only for a stored track', () => {
    renderRow({
      association: association({ fileStatus: TrackFileStatus.Pending })
    });

    expect(screen.getByText('Blue In Green')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Play Blue In Green' })
    ).not.toBeInTheDocument();
  });

  it('opens the action menu and removes the track', () => {
    const { onRemove } = renderRow({});

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for Blue In Green' })
    );
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Remove from playlist' })
    );

    expect(onRemove).toHaveBeenCalledWith('track-1');
  });

  it('draws no menu when the caller cannot curate', () => {
    renderRow({ onRemove: null });

    expect(
      screen.queryByRole('button', { name: 'Actions for Blue In Green' })
    ).not.toBeInTheDocument();
  });

  it('offers retry, fetch whole and remove in the menu on a failed track', () => {
    const onRetry = vi.fn();
    const onFetchWhole = vi.fn();

    renderRow({
      association: association({
        fileStatus: TrackFileStatus.Failed,
        failureReason: 'Download failed, will retry on the next sync'
      }),
      onRetry,
      onFetchWhole
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for Blue In Green' })
    );

    expect(screen.getByRole('menuitem', { name: 'Retry' })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Fetch whole' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledWith('track-1');

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for Blue In Green' })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Fetch whole' }));
    expect(onFetchWhole).toHaveBeenCalledWith('track-1');
  });

  it('offers no fetch whole on a stored track', () => {
    renderRow({ onFetchWhole: vi.fn() });

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for Blue In Green' })
    );

    expect(
      screen.queryByRole('menuitem', { name: 'Fetch whole' })
    ).not.toBeInTheDocument();
  });

  it('offers no fetch whole when the caller cannot act', () => {
    renderRow({
      association: association({ fileStatus: TrackFileStatus.Failed }),
      onRetry: vi.fn()
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for Blue In Green' })
    );

    expect(
      screen.queryByRole('menuitem', { name: 'Fetch whole' })
    ).not.toBeInTheDocument();
  });

  it('offers only the remove on a failed track the caller cannot retry', () => {
    renderRow({
      association: association({ fileStatus: TrackFileStatus.Failed })
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for Blue In Green' })
    );

    expect(
      screen.queryByRole('menuitem', { name: 'Retry' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Fetch whole' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Remove from playlist' })
    ).toBeInTheDocument();
  });

  it('disables the menu while a row action is in flight', () => {
    renderRow({
      association: association({ fileStatus: TrackFileStatus.Failed }),
      onRetry: vi.fn(),
      busy: true
    });

    expect(
      screen.getByRole('button', { name: 'Actions for Blue In Green' })
    ).toBeDisabled();
  });

  it('disables the menu while the track is downloading', () => {
    renderRow({
      association: association({ fileStatus: TrackFileStatus.Downloading })
    });

    expect(
      screen.getByRole('button', { name: 'Actions for Blue In Green' })
    ).toBeDisabled();
  });

  it('marks a downloading track so the row can breathe', () => {
    renderRow({
      association: association({ fileStatus: TrackFileStatus.Downloading })
    });

    expect(screen.getByRole('listitem')).toHaveAttribute(
      'data-downloading',
      'true'
    );
  });

  it('does not mark a stored track as downloading', () => {
    renderRow({});

    expect(screen.getByRole('listitem')).not.toHaveAttribute(
      'data-downloading'
    );
  });

  it('says nothing for a stored track that is still available', () => {
    renderRow({});

    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });

  it('says full length for a track recorded without trimming', () => {
    renderRow({ association: association({ skipNonMusic: false }) });

    expect(screen.getByText('Full length')).toBeInTheDocument();
  });

  it('says nothing about the policy on a track that skips non-music parts', () => {
    renderRow({});

    expect(screen.queryByText('Full length')).not.toBeInTheDocument();
  });

  it('shows the mapped word and holds the raw reason to one line with a title', () => {
    renderRow({
      association: association({
        fileStatus: TrackFileStatus.Failed,
        failureReason: 'Download failed, will retry on the next sync'
      })
    });

    expect(screen.getByText('Failed')).toBeInTheDocument();
    /* The raw sentence is secondary and bounded: present, but carrying its full
     * text as a title so it cannot set the row's geometry. */
    const reason = screen.getByText(
      'Download failed, will retry on the next sync'
    );
    expect(reason).toHaveAttribute(
      'title',
      'Download failed, will retry on the next sync'
    );
  });

  it('keeps a removed track playable and names the source it left', () => {
    const { onPlay } = renderRow({
      association: association({ sourceStatus: TrackSourceStatus.Removed })
    });

    expect(screen.getByText('Removed from YouTube')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play Blue In Green' }));
    expect(onPlay).toHaveBeenCalledWith('track-1');
  });

  it('keeps the removed title at full ink, because the row still plays', () => {
    renderRow({
      association: association({ sourceStatus: TrackSourceStatus.Removed })
    });

    /* Playable, so no quiet tier: the removal is said on the state line, not by
     * stepping the title down. */
    expect(screen.getByRole('listitem')).toHaveAttribute(
      'data-playable',
      'true'
    );
  });

  it('steps an unplayable row down and leaves a downloading row alone', () => {
    const { unmount } = renderRow({
      association: association({ fileStatus: TrackFileStatus.Pending })
    });

    /* Not playable and not downloading: the title takes the quiet tier. */
    expect(screen.getByRole('listitem')).not.toHaveAttribute('data-playable');
    expect(screen.getByRole('listitem')).not.toHaveAttribute(
      'data-downloading'
    );

    unmount();
    renderRow({
      association: association({ fileStatus: TrackFileStatus.Downloading })
    });

    /* Downloading is the exception: the breathing animation is the cue. */
    expect(screen.getByRole('listitem')).toHaveAttribute(
      'data-downloading',
      'true'
    );
  });

  it('draws the equalizer on the current track whether playing or paused', () => {
    renderRow({ current: true, playing: true });
    expect(screen.getByRole('img', { name: 'Playing' })).toBeInTheDocument();
  });

  it('keeps the equalizer still on the current track when paused', () => {
    renderRow({ current: true, playing: false });
    expect(screen.getByRole('img', { name: 'Playing' })).toBeInTheDocument();
  });

  it('draws no equalizer on a non-current row', () => {
    renderRow({ current: false, playing: false });
    expect(
      screen.queryByRole('img', { name: 'Playing' })
    ).not.toBeInTheDocument();
  });

  it('darkens the current track whether it is playing or paused', () => {
    renderRow({ current: true, playing: true });
    expect(
      screen.getByRole('listitem').querySelector('[class*="scrim"]')
    ).not.toBeNull();
  });

  it('keeps the darkening when the current track is paused', () => {
    renderRow({ current: true, playing: false });
    expect(
      screen.getByRole('listitem').querySelector('[class*="scrim"]')
    ).not.toBeNull();
  });

  it('leaves a non-current track undarkened', () => {
    renderRow({ current: false, playing: false });
    expect(
      screen.getByRole('listitem').querySelector('[class*="scrim"]')
    ).toBeNull();
  });

  it('marks the current track with its playback state', () => {
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
