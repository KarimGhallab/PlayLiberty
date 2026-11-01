import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider, Language } from '@playliberty/i18n';

import type { ApiConfig } from '../../auth/useApiConfig';
import { usePlayerStore } from '../playerStore/playerStore';
import type { PlayerTrack } from '../playerTrack/playerTrack';
import PlayerBar from './PlayerBar';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() }
}));

const { router } = jest.requireMock<{
  router: { navigate: jest.Mock };
}>('expo-router');

const store = { getItem: () => null, setItem: () => {} };

const config: ApiConfig = {
  baseUrl: 'https://instance.test',
  token: { id: 'token-id', secret: 'token-secret' }
};

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 24 }
};

const track: PlayerTrack = {
  id: 'track-1',
  title: 'First Song',
  durationSeconds: 182,
  thumbnailPath: 'thumbs/1.jpg'
};

const secondTrack: PlayerTrack = {
  ...track,
  id: 'track-2',
  title: 'Second Song'
};

async function renderBar(language = Language.English) {
  await render(
    <I18nProvider initialLanguage={language} storage={store}>
      <SafeAreaProvider initialMetrics={metrics}>
        <PlayerBar config={config} />
      </SafeAreaProvider>
    </I18nProvider>
  );
}

function startPlaylist(): void {
  usePlayerStore
    .getState()
    .start([track], { id: 'playlist-1', name: 'Rain On The Window' }, track.id);
}

beforeEach(() => {
  jest.clearAllMocks();
  usePlayerStore.getState().clear();
});

describe('the player bar', () => {
  it('is absent when nothing plays', async () => {
    await renderBar();

    expect(screen.queryByTestId('player-bar')).not.toBeOnTheScreen();
  });

  it('draws the artwork, the title and the playlist above the bottom inset', async () => {
    startPlaylist();
    await renderBar();

    expect(screen.getByTestId('player-bar')).toHaveStyle({ bottom: 24 });
    expect(screen.getByText('First Song')).toBeOnTheScreen();
    expect(screen.getByText('Rain On The Window')).toBeOnTheScreen();

    const image = screen.getByTestId('player-bar-artwork');

    expect(image.props.source.uri).toBe(
      'https://instance.test/api/v1/tracks/track-1/thumbnail'
    );
    expect(image.props.source.headers).toEqual({
      'P-Access-Token-Id': 'token-id',
      'P-Access-Token': 'token-secret',
      'User-Agent': 'PlayLiberty/1.0 (Android)'
    });
  });

  it('pauses and resumes the same track from one control', async () => {
    startPlaylist();
    await renderBar();

    fireEvent.press(screen.getByLabelText('Pause First Song'));

    expect(usePlayerStore.getState().isPlaying).toBe(false);

    await waitFor(() => {
      expect(screen.getByLabelText('Play First Song')).toBeOnTheScreen();
    });

    fireEvent.press(screen.getByLabelText('Play First Song'));

    expect(usePlayerStore.getState().isPlaying).toBe(true);

    await waitFor(() => {
      expect(screen.getByLabelText('Pause First Song')).toBeOnTheScreen();
    });
  });

  it('explains a playback failure and clears it on retry', async () => {
    startPlaylist();
    await renderBar();

    await act(() => {
      usePlayerStore.getState().failPlayback('track-1');
    });

    await waitFor(() => {
      expect(screen.getByTestId('notice')).toHaveTextContent(
        /Playback failed: First Song/
      );
    });
    expect(screen.getByTestId('notice')).toHaveTextContent(
      /Play it again to retry, or choose another track/
    );

    fireEvent.press(screen.getByLabelText('Play First Song'));

    await waitFor(() => {
      expect(screen.queryByTestId('notice')).not.toBeOnTheScreen();
    });
  });

  it('explains a refused notification permission', async () => {
    startPlaylist();
    await renderBar();

    await act(() => {
      usePlayerStore.getState().showBackgroundNotice();
    });

    await waitFor(() => {
      expect(screen.getByTestId('notice')).toHaveTextContent(
        /Allow notifications to control the tracks/
      );
    });

    await act(() => {
      usePlayerStore.getState().dismissBackgroundNotice();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('notice')).not.toBeOnTheScreen();
    });
  });

  it('moves next and disables next at the last entry', async () => {
    usePlayerStore
      .getState()
      .start(
        [track, secondTrack],
        { id: 'playlist-1', name: 'Rain On The Window' },
        track.id
      );
    await renderBar();

    expect(screen.getByLabelText('Next track, First Song')).not.toBeDisabled();

    fireEvent.press(screen.getByLabelText('Next track, First Song'));

    await waitFor(() => {
      expect(screen.getByText('Second Song')).toBeOnTheScreen();
    });
    expect(usePlayerStore.getState().currentId).toBe('track-2');
    expect(usePlayerStore.getState().isPlaying).toBe(true);
    expect(screen.getByLabelText('Next track, Second Song')).toBeDisabled();
  });

  it('moves previous from the bar', async () => {
    usePlayerStore
      .getState()
      .start(
        [track, secondTrack],
        { id: 'playlist-1', name: 'Rain On The Window' },
        secondTrack.id
      );
    await renderBar();

    fireEvent.press(screen.getByLabelText('Previous track, Second Song'));

    await waitFor(() => {
      expect(screen.getByText('First Song')).toBeOnTheScreen();
    });
    expect(usePlayerStore.getState().currentId).toBe('track-1');
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('reports the elapsed and total time', async () => {
    startPlaylist();
    usePlayerStore.getState().setPosition(30);
    await renderBar();

    expect(screen.getByTestId('player-elapsed')).toHaveTextContent('0:30');
    expect(screen.getByTestId('player-duration')).toHaveTextContent('3:02');
    expect(
      screen.getByTestId('player-seek').props.accessibilityValue.text
    ).toBe('0:30 of 3:02');
  });

  it('seeks once on release and resumes a playing player', async () => {
    startPlaylist();
    await renderBar();

    const rail = screen.getByTestId('player-seek');

    await act(() => {
      rail.props.onLayout({ nativeEvent: { layout: { width: 200 } } });
      rail.props.onResponderGrant({ nativeEvent: { locationX: 100 } });
      rail.props.onResponderMove({ nativeEvent: { locationX: 150 } });
    });

    expect(usePlayerStore.getState().isPlaying).toBe(false);

    await act(() => {
      rail.props.onResponderRelease({ nativeEvent: { locationX: 150 } });
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().positionSeconds).toBeCloseTo(136.5);
    });

    expect(usePlayerStore.getState().seekTo).toBeCloseTo(136.5);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it('keeps a paused player paused after a seek', async () => {
    startPlaylist();
    usePlayerStore.getState().setPlaying(false);
    await renderBar();

    const rail = screen.getByTestId('player-seek');

    await act(() => {
      rail.props.onLayout({ nativeEvent: { layout: { width: 200 } } });
      rail.props.onResponderGrant({ nativeEvent: { locationX: 100 } });
      rail.props.onResponderRelease({ nativeEvent: { locationX: 100 } });
    });

    await waitFor(() => {
      expect(usePlayerStore.getState().positionSeconds).toBeCloseTo(91);
    });

    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('adjusts the rail by ten seconds for a screen reader', async () => {
    startPlaylist();
    await renderBar();

    const rail = screen.getByTestId('player-seek');

    await act(() => {
      rail.props.onAccessibilityAction({
        nativeEvent: { actionName: 'increment' }
      });
    });

    expect(usePlayerStore.getState().positionSeconds).toBe(10);
    expect(usePlayerStore.getState().seekTo).toBe(10);

    await act(() => {
      rail.props.onAccessibilityAction({
        nativeEvent: { actionName: 'decrement' }
      });
    });

    expect(usePlayerStore.getState().positionSeconds).toBe(0);
  });

  it('leaves the rail inert without a duration', async () => {
    usePlayerStore.getState().startBareTrack({
      ...track,
      durationSeconds: null
    });
    await renderBar();

    const rail = screen.getByTestId('player-seek');

    expect(rail.props.accessibilityState).toEqual({ disabled: true });
    expect(rail.props.accessibilityActions).toEqual([]);

    await act(() => {
      rail.props.onAccessibilityAction({
        nativeEvent: { actionName: 'increment' }
      });
    });

    expect(usePlayerStore.getState().positionSeconds).toBe(0);
    expect(usePlayerStore.getState().seekTo).toBeNull();
  });

  it('draws a bare track without a playlist or a link', async () => {
    usePlayerStore.getState().startBareTrack(track);
    await renderBar();

    expect(screen.getByText('First Song')).toBeOnTheScreen();
    expect(screen.queryByText('Rain On The Window')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('player-open-playlist')).not.toBeOnTheScreen();
  });

  it('opens the playlist from the artwork', async () => {
    startPlaylist();
    await renderBar();

    fireEvent.press(screen.getByTestId('player-open-playlist'));

    expect(router.navigate).toHaveBeenCalledWith({
      pathname: '/playlists/[playlistId]',
      params: { playlistId: 'playlist-1' }
    });
  });

  it('names the controls in both languages', async () => {
    startPlaylist();
    await renderBar(Language.French);

    expect(
      screen.getByLabelText('Ouvrir Rain On The Window')
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Piste précédente, First Song')
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Piste suivante, First Song')
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Mettre en pause First Song')
    ).toBeOnTheScreen();

    const rail = screen.getByTestId('player-seek');

    expect(rail.props.accessibilityLabel).toBe('Position dans la piste');
    expect(rail.props.accessibilityValue.text).toBe('0:00 sur 3:02');
    expect(rail.props.accessibilityActions).toEqual([
      { name: 'increment', label: 'Avancer de dix secondes' },
      { name: 'decrement', label: 'Reculer de dix secondes' }
    ]);
  });
});
