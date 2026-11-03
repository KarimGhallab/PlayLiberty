import { describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react-native';
import { PixelRatio } from 'react-native';

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
const hidden = { includeHiddenElements: true };

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

/* A stored file whose source broke still plays, and still offers its reason. */
const storedWithReason: PlaylistTrack = {
  ...stored,
  track: {
    ...track,
    failureKind: FailureKind.Network,
    failureReason: 'yt-dlp: HTTP 403'
  }
};

async function renderRow(
  association: PlaylistTrack = stored,
  options: {
    readonly current?: boolean;
    readonly playing?: boolean;
    readonly language?: Language;
    readonly onOpenActions?: (trackId: string) => void;
  } = {}
) {
  const onPlay = jest.fn();
  const current = options.current ?? false;

  await render(
    <I18nProvider
      initialLanguage={options.language ?? Language.English}
      storage={store}>
      <TrackRow
        association={association}
        config={config}
        current={current}
        playing={options.playing ?? current}
        onOpenActions={options.onOpenActions}
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
      'P-Access-Token': 'token-secret',
      'User-Agent': 'PlayLiberty/1.0 (Android)'
    });
    expect(screen.getByText('First Song', hidden)).toBeOnTheScreen();
    expect(screen.getByText('3:02', hidden)).toBeOnTheScreen();
  });

  it('gives the title a second line above 1.3', async () => {
    const scale = jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(2);
    await renderRow();

    expect(screen.getByTestId('track-title', hidden).props.numberOfLines).toBe(
      2
    );

    scale.mockRestore();
  });

  it('keeps the title on one line at 1.3', async () => {
    const scale = jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1.3);
    await renderRow();

    expect(screen.getByTestId('track-title', hidden).props.numberOfLines).toBe(
      1
    );

    scale.mockRestore();
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
    expect(screen.getByTestId('track-details')).toHaveStyle({
      minHeight: 48
    });
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

    expect(screen.getByText('Playing', hidden)).toBeOnTheScreen();
    expect(
      screen.getByTestId('track-bars', { includeHiddenElements: true })
    ).toBeOnTheScreen();
  });

  it('names the paused state on a current row held by a paused queue', async () => {
    await renderRow(stored, { current: true, playing: false });

    expect(screen.getByText('Paused', hidden)).toBeOnTheScreen();
    expect(screen.getByTestId('track-play').props.accessibilityLabel).toBe(
      'First Song, Paused, 3:02'
    );
  });

  it('announces the row and starts the queue at its track', async () => {
    const { onPlay } = await renderRow(stored, { current: true });
    const play = screen.getByTestId('track-play');

    expect(play.props.accessibilityLabel).toBe('First Song, Playing, 3:02');

    fireEvent.press(play);

    expect(onPlay).toHaveBeenCalledWith('track-1');
  });

  it('plays on a tap but not on a drag', async () => {
    const { onPlay } = await renderRow();
    const play = screen.getByTestId('track-play');
    const touchAt = (x: number, y: number) => ({
      nativeEvent: { touches: [{ pageX: x, pageY: y }] }
    });

    await fireEvent(play, 'touchStart', touchAt(10, 20));
    await fireEvent.press(play);

    expect(onPlay).toHaveBeenCalledTimes(1);

    onPlay.mockClear();
    await fireEvent(play, 'touchStart', touchAt(10, 20));
    await fireEvent(play, 'touchMove', touchAt(60, 24));
    await fireEvent.press(play);

    expect(onPlay).not.toHaveBeenCalled();

    await fireEvent(play, 'touchStart', touchAt(10, 20));
    await fireEvent(play, 'touchMove', touchAt(14, 70));
    await fireEvent.press(play);

    expect(onPlay).not.toHaveBeenCalled();
  });

  it('reads a playable row once, keeping the sentence, the disclosure and the lane', async () => {
    const onOpenActions = jest.fn();
    await renderRow(storedWithReason, { onOpenActions });

    expect(
      screen.getByRole('button', { name: 'First Song, 3:02' })
    ).toBeOnTheScreen();
    expect(screen.queryByText('First Song')).not.toBeOnTheScreen();
    expect(screen.queryByText('3:02')).not.toBeOnTheScreen();
    expect(screen.getByText('YouTube could not be reached.')).toBeOnTheScreen();
    expect(screen.getByTestId('track-details')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Actions for First Song' })
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('track-actions'));

    expect(onOpenActions).toHaveBeenCalledWith('track-1');
  });

  it('exposes the copy of a row that cannot play', async () => {
    await renderRow(failed);

    expect(screen.getByText('First Song')).toBeOnTheScreen();
    expect(screen.getByText('3:02')).toBeOnTheScreen();
    expect(screen.getByTestId('track-details')).toBeOnTheScreen();
  });

  it('opens the lane for its track', async () => {
    const onOpenActions = jest.fn();
    await renderRow(stored, { onOpenActions });

    fireEvent.press(screen.getByTestId('track-actions'));

    expect(onOpenActions).toHaveBeenCalledWith('track-1');
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
