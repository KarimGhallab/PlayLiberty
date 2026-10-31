import { describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react-native';

import {
  AssociationOrigin,
  FailureKind,
  type PlaylistTrack,
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';
import { TrackTone } from '@playliberty/ui-foundation';

import { trackToneColor } from '../../../shared/trackState/trackToneColor';

import type { ApiConfig } from '../../../auth/useApiConfig';
import TrackRow from './TrackRow';

const store = { getItem: () => null, setItem: () => {} };

const config: ApiConfig = {
  baseUrl: 'https://instance.test',
  token: { id: 'token-id', secret: 'token-secret' }
};

const track = {
  id: 'track-1',
  provider: Provider.Youtube,
  videoId: 'video-1',
  title: 'First Song',
  durationSeconds: 182,
  skipNonMusic: false,
  thumbnailPath: 'thumbs/1.jpg',
  fileStatus: TrackFileStatus.Stored,
  sourceStatus: TrackSourceStatus.Available,
  failureKind: null,
  failureReason: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z'
};

const stored: PlaylistTrack = {
  track,
  origin: AssociationOrigin.Remote,
  position: 0
};

const pending: PlaylistTrack = {
  ...stored,
  track: { ...track, fileStatus: TrackFileStatus.Pending }
};

const failed: PlaylistTrack = {
  ...stored,
  track: {
    ...track,
    fileStatus: TrackFileStatus.Failed,
    failureKind: FailureKind.Network,
    failureReason: 'yt-dlp: HTTP 403'
  }
};

async function renderRow(
  association: PlaylistTrack = stored,
  options: { readonly current?: boolean; readonly language?: Language } = {}
) {
  const onPlay = jest.fn();

  await render(
    <I18nProvider
      initialLanguage={options.language ?? Language.English}
      storage={store}>
      <TrackRow
        association={association}
        config={config}
        current={options.current ?? false}
        onPlay={onPlay}
      />
    </I18nProvider>
  );

  return { onPlay };
}

describe('the track row', () => {
  it('draws the artwork, title and duration', async () => {
    await renderRow();

    const image = screen.getByTestId('track-artwork-image');

    expect(image.props.source.uri).toBe(
      'https://instance.test/api/v1/tracks/track-1/thumbnail'
    );
    expect(image.props.source.headers).toEqual({
      'P-Access-Token-Id': 'token-id',
      'P-Access-Token': 'token-secret'
    });
    expect(screen.getByText('First Song')).toBeOnTheScreen();
    expect(screen.getByText('3:02')).toBeOnTheScreen();
  });

  it('draws the state word and its tone', async () => {
    await renderRow(pending);

    expect(screen.getByTestId('track-state')).toHaveTextContent('Pending');
    expect(screen.getByTestId('track-state')).toHaveStyle({
      color: trackToneColor(TrackTone.Pending)
    });
  });

  it('reveals the failure sentence and the raw reason', async () => {
    await renderRow(failed);

    expect(screen.getByText('YouTube could not be reached.')).toBeOnTheScreen();
    expect(screen.queryByTestId('track-reason')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('track-details'));

    await waitFor(() => {
      expect(screen.getByTestId('track-reason')).toHaveTextContent(
        'yt-dlp: HTTP 403'
      );
    });

    fireEvent.press(screen.getByTestId('track-details'));

    await waitFor(() => {
      expect(screen.queryByTestId('track-reason')).not.toBeOnTheScreen();
    });
  });

  it('marks the current row with its word and bars', async () => {
    await renderRow(stored, { current: true });

    expect(screen.getByText('Playing')).toBeOnTheScreen();
    expect(
      screen.getByTestId('track-bars', { includeHiddenElements: true })
    ).toBeOnTheScreen();
  });

  it('announces the row and starts the queue at its track', async () => {
    const { onPlay } = await renderRow(stored, { current: true });
    const play = screen.getByTestId('track-play');

    expect(play.props.accessibilityLabel).toBe('First Song, Playing, 3:02');

    fireEvent.press(play);

    expect(onPlay).toHaveBeenCalledWith('track-1');
  });

  it('draws no play control for an unplayable row', async () => {
    await renderRow(failed);

    expect(screen.queryByTestId('track-play')).not.toBeOnTheScreen();
    expect(screen.getByText('First Song')).toBeOnTheScreen();
    expect(screen.getByText('Failed')).toBeOnTheScreen();
  });

  it('renders the state word in French', async () => {
    await renderRow(pending, { language: Language.French });

    expect(screen.getByTestId('track-state')).toHaveTextContent('En attente');
  });
});
