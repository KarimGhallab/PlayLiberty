import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError, useTrack } from '@playliberty/api-client';
import type * as ApiClientModule from '@playliberty/api-client';
import {
  Provider,
  type Track,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import {
  SessionStatus,
  useSessionStore
} from '../../../auth/sessionStore/sessionStore';
import { playerBarHeight } from '../../../player/playerBarSize/playerBarSize';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import {
  holdLeftPlaylistNotice,
  takeLeftPlaylistNotice
} from '../leftPlaylistNotice/leftPlaylistNotice';
import BareTrackEntry from './BareTrackEntry';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() }
}));

jest.mock('@playliberty/api-client', () => ({
  ...jest.requireActual<typeof ApiClientModule>('@playliberty/api-client'),
  useTrack: jest.fn()
}));

const { router } = jest.requireMock('expo-router') as {
  router: { replace: jest.Mock };
};

const useTrackMock = useTrack as jest.MockedFunction<typeof useTrack>;

const store = { getItem: () => null, setItem: () => {} };
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

const track: Track = {
  id: 'track-1',
  provider: Provider.Youtube,
  videoId: 'video-1',
  title: 'First Song',
  durationSeconds: 182,
  skipNonMusic: false,
  thumbnailPath: 'thumbnails/track-1.webp',
  fileStatus: TrackFileStatus.Stored,
  sourceStatus: TrackSourceStatus.Available,
  failureKind: null,
  failureReason: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z'
};

function queryResult(data: Track) {
  return {
    data,
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    error: null
  } as never;
}

function failedResult(error: Error) {
  return {
    data: undefined,
    isPending: false,
    isError: true,
    isSuccess: false,
    isFetching: false,
    error
  } as never;
}

function pendingResult() {
  return {
    data: undefined,
    isPending: true,
    isError: false,
    isSuccess: false,
    isFetching: true,
    error: null
  } as never;
}

function renderEntry(trackId = 'track-1') {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <BareTrackEntry trackId={trackId} />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

const playlistTrack = {
  id: 'other-1',
  title: 'Other',
  durationSeconds: 100,
  thumbnailPath: null
};

beforeEach(() => {
  jest.clearAllMocks();
  usePlayerStore.getState().clear();
  useSessionStore.setState({ status: SessionStatus.SignedIn });
  takeLeftPlaylistNotice();
  useTrackMock.mockReturnValue(queryResult(track));
});

describe('the bare track entry', () => {
  it('holds the bar while the track read lands', async () => {
    useTrackMock.mockReturnValue(pendingResult());

    await renderEntry();

    expect(screen.getByLabelText('Opening the track.')).toBeOnTheScreen();
    expect(screen.getByTestId('bare-track-loading')).toHaveStyle({
      height: playerBarHeight - 6
    });
    expect(usePlayerStore.getState().currentId).toBeNull();
  });

  it('does not hold the bar when the session cannot read', async () => {
    useSessionStore.setState({ status: SessionStatus.SignedOut });
    useTrackMock.mockReturnValue(pendingResult());

    await renderEntry();

    expect(screen.queryByLabelText('Opening the track.')).not.toBeOnTheScreen();
  });

  it('starts the one-track queue with no playlist context', async () => {
    await renderEntry();

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-1');
    });
    expect(screen.queryByLabelText('Opening the track.')).not.toBeOnTheScreen();
    const player = usePlayerStore.getState();

    expect(useTrackMock).toHaveBeenCalledWith('track-1', true);
    expect(player.queue).toEqual(['track-1']);
    expect(player.sourceQueue).toEqual(['track-1']);
    expect(player.playlistId).toBeNull();
    expect(player.playlistName).toBeNull();
    expect(player.isPlaying).toBe(true);
    expect(player.tracks['track-1']).toEqual({
      id: 'track-1',
      title: 'First Song',
      durationSeconds: 182,
      thumbnailPath: 'thumbnails/track-1.webp'
    });
  });

  it('replaces another queue with the bare track and keeps the address', async () => {
    usePlayerStore
      .getState()
      .start([playlistTrack], { id: 'playlist-1', name: 'Paradis' }, 'other-1');

    await renderEntry();

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-1');
    });
    expect(usePlayerStore.getState().playlistId).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('does not restart the bare track it already holds', async () => {
    usePlayerStore.getState().startBareTrack({
      id: 'track-1',
      title: 'First Song',
      durationSeconds: 182,
      thumbnailPath: null
    });
    usePlayerStore.getState().setPosition(20);
    usePlayerStore.getState().setPlaying(false);

    await renderEntry();

    expect(usePlayerStore.getState().currentId).toBe('track-1');
    expect(usePlayerStore.getState().positionSeconds).toBe(20);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('replaces the bare address when a playlist starts', async () => {
    await renderEntry();
    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-1');
    });

    await act(async () => {
      usePlayerStore
        .getState()
        .start(
          [playlistTrack],
          { id: 'playlist-1', name: 'Paradis' },
          'other-1'
        );
    });

    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('does not read or start when the session is signed out', async () => {
    useSessionStore.setState({ status: SessionStatus.SignedOut });

    await renderEntry();

    expect(useTrackMock).toHaveBeenCalledWith('track-1', false);
    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('says an unknown track is not available and keeps the address', async () => {
    useTrackMock.mockReturnValue(failedResult(new ApiError(404, null)));

    await renderEntry();

    await waitFor(() => {
      expect(
        screen.getByText('This track is not available.')
      ).toBeOnTheScreen();
    });
    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('explains a track that cannot play and starts nothing', async () => {
    useTrackMock.mockReturnValue(
      queryResult({ ...track, fileStatus: TrackFileStatus.Failed })
    );

    await renderEntry();

    await waitFor(() => {
      expect(screen.getByText('First Song cannot play.')).toBeOnTheScreen();
    });
    expect(screen.getByText('Its download failed.')).toBeOnTheScreen();
    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('plays a track that left its playlist with the left-playlist notice', async () => {
    holdLeftPlaylistNotice();

    await renderEntry();

    await waitFor(() => {
      expect(usePlayerStore.getState().currentId).toBe('track-1');
    });
    expect(
      screen.getByText('First Song is no longer in that playlist.')
    ).toBeOnTheScreen();
    expect(takeLeftPlaylistNotice()).toBe(false);
  });
});
