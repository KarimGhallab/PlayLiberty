import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PlaylistTrack } from '@playliberty/contracts';
import {
  AssociationOrigin,
  FailureKind,
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

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
      failureKind: null,
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
  readonly starting?: boolean;
  readonly pending?: boolean;
}): {
  onPlay: ReturnType<typeof vi.fn>;
  onRemove: ReturnType<typeof vi.fn>;
  unmount: () => void;
  container: HTMLElement;
} {
  const onPlay = vi.fn();
  const onRemove = vi.fn();
  const resolvedRemove =
    options.onRemove === null ? undefined : (options.onRemove ?? onRemove);

  const { unmount, container } = render(
    <I18nProvider preferred={['en']}>
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
          starting={options.starting ?? false}
          pending={options.pending ?? false}
        />
      </ul>
    </I18nProvider>
  );

  return { onPlay, onRemove, unmount, container };
}

describe('TrackRow', () => {
  it('marks a pending row and disables its lane and play', () => {
    const { container } = renderRow({ pending: true });

    const row = container.querySelector('li');
    expect(row).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('button', { name: 'Play Blue In Green' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Actions for Blue In Green' })
    ).toBeDisabled();
  });

  it('marks the pressed row while its queue read is in flight', () => {
    const { container } = renderRow({ starting: true, onRemove: vi.fn() });

    const row = container.querySelector('li');
    expect(row).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('button', { name: 'Play Blue In Green' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Actions for Blue In Green' })
    ).toBeDisabled();
  });

  it('plays the track when the row is pressed', () => {
    const { onPlay } = renderRow({});

    fireEvent.click(screen.getByRole('button', { name: 'Play Blue In Green' }));

    expect(onPlay).toHaveBeenCalledWith('track-1');
  });

  it('falls back to the hatch when the thumbnail fails to load', () => {
    const { container } = renderRow({
      association: association({ thumbnailPath: 'thumbnails/track-1.jpg' })
    });

    expect(container.querySelector('[data-art="art"]')).toBeInTheDocument();
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', '/api/v1/tracks/track-1/thumbnail');

    fireEvent.error(image as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-art="no-art"]')).toBeInTheDocument();
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
        failureKind: FailureKind.Unknown,
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

  it('says full length for a track recorded without trimming', () => {
    renderRow({ association: association({ skipNonMusic: false }) });

    expect(screen.getByText('Full length')).toBeInTheDocument();
  });

  it('says nothing about the policy on a track that skips non-music parts', () => {
    renderRow({});

    expect(screen.queryByText('Full length')).not.toBeInTheDocument();
  });

  it('leads a failed row with a mapped sentence and reveals the raw reason', () => {
    renderRow({
      association: association({
        fileStatus: TrackFileStatus.Failed,
        failureKind: FailureKind.Blocked,
        failureReason:
          'yt-dlp exited with code 1: ERROR: unable to download video data: HTTP Error 403: Forbidden'
      })
    });

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(
      screen.getByText('YouTube blocked this download.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/yt-dlp/)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Show details for Blue In Green'
      })
    );

    expect(screen.getByText(/yt-dlp/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Hide details for Blue In Green'
      })
    );

    expect(screen.queryByText(/yt-dlp/)).not.toBeInTheDocument();
  });

  it('keeps a removed track playable and names the source it left', () => {
    const { onPlay } = renderRow({
      association: association({ sourceStatus: TrackSourceStatus.Removed })
    });

    expect(screen.getByText('Removed from YouTube')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Play Blue In Green' }));
    expect(onPlay).toHaveBeenCalledWith('track-1');
  });

  it('announces playing on the current track while the queue runs', () => {
    renderRow({ current: true, playing: true });
    expect(screen.getByText('Playing')).toBeInTheDocument();
  });

  /* The word is drawn for the current track in both states, so it names the
   * playback state and not the row's presence. */
  it('announces paused, not playing, on the current track while the queue is held', () => {
    renderRow({ current: true, playing: false });

    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.queryByText('Playing')).not.toBeInTheDocument();
  });

  it('marks no row but the current one', () => {
    renderRow({ current: false, playing: false });

    expect(screen.queryByText('Playing')).not.toBeInTheDocument();
    expect(screen.queryByText('Paused')).not.toBeInTheDocument();
  });

  it('shows a placeholder rather than a zero when the duration is unknown', () => {
    renderRow({ association: association({ durationSeconds: null }) });

    expect(screen.getByText('--:--')).toBeInTheDocument();
  });
});
