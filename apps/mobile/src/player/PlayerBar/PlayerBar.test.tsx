import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
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
      'P-Access-Token': 'token-secret'
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

  it('names the playlist link in both languages', async () => {
    startPlaylist();
    await renderBar(Language.French);

    expect(
      screen.getByLabelText('Ouvrir Rain On The Window')
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Mettre en pause First Song')
    ).toBeOnTheScreen();
  });
});
