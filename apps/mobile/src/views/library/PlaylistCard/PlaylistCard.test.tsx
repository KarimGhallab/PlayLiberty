import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import {
  PlaylistSort,
  PlaylistSyncStatus,
  type PlaylistWithCounts,
  Provider,
  ShareLevel
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import type { ApiConfig } from '../../../auth/useApiConfig/useApiConfig';
import PlaylistCard, { type PlaylistCardProps } from './PlaylistCard';

const store = { getItem: () => null, setItem: () => {} };
const hidden = { includeHiddenElements: true };

const config: ApiConfig = {
  baseUrl: 'https://instance.test',
  token: { id: 'token-id', secret: 'token-secret' }
};

const playlist: PlaylistWithCounts = {
  id: 'playlist-1',
  ownerAccountId: 'account-1',
  name: 'Rain On The Window',
  coverTrackId: 'track-1',
  coverUpdatedAt: '2026-10-01T00:00:00.000Z',
  provider: Provider.Youtube,
  sourcePlaylistId: 'PL-demo',
  syncStatus: PlaylistSyncStatus.Idle,
  lastSyncedAt: '2026-09-29T12:00:00.000Z',
  trackCount: 12,
  skipNonMusic: true,
  sort: PlaylistSort.Playlist,
  access: 'owner',
  hasShares: false,
  pinned: false,
  counts: {
    stored: 9,
    pending: 1,
    downloading: 0,
    failed: 2,
    unavailable: 0
  },
  remoteRemoved: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z'
};

async function renderCard(overrides: Partial<PlaylistCardProps> = {}) {
  const onOpen = jest.fn();
  const onOpenActions = jest.fn();
  const onPlay = jest.fn();
  const onShuffle = jest.fn();
  const props: PlaylistCardProps = {
    playlist,
    ownerName: null,
    config,
    onOpen,
    onOpenActions,
    onPlay,
    onShuffle,
    ...overrides
  };

  await render(
    <I18nProvider initialLanguage={Language.English} storage={store}>
      <PlaylistCard {...props} />
    </I18nProvider>
  );

  return { onOpen, onOpenActions, onPlay, onShuffle };
}

describe('the playlist card', () => {
  it('draws the custom cover with the token headers', async () => {
    await renderCard();

    const image = screen.getByTestId('playlist-cover-image', hidden);

    expect(image.props.source.uri).toBe(
      'https://instance.test/api/v1/playlists/playlist-1/cover?v=2026-10-01T00%3A00%3A00.000Z'
    );
    expect(image.props.source.headers).toEqual({
      'P-Access-Token-Id': 'token-id',
      'P-Access-Token': 'token-secret',
      'User-Agent': 'PlayLiberty/1.0 (Android)'
    });
  });

  it('falls back from the custom cover to the track thumbnail to the sleeve', async () => {
    await renderCard();

    await fireEvent(
      screen.getByTestId('playlist-cover-image', hidden),
      'error'
    );

    expect(
      screen.getByTestId('playlist-cover-image', hidden).props.source.uri
    ).toBe('https://instance.test/api/v1/tracks/track-1/thumbnail?v=track-1');

    await fireEvent(
      screen.getByTestId('playlist-cover-image', hidden),
      'error'
    );

    expect(
      screen.queryByTestId('playlist-cover-image', hidden)
    ).not.toBeOnTheScreen();
  });

  it('versions the first-track fallback so a changed track is a new image', async () => {
    await renderCard({
      playlist: {
        ...playlist,
        coverTrackId: 'track-2',
        coverUpdatedAt: null
      }
    });

    expect(
      screen.getByTestId('playlist-cover-image', hidden).props.source.uri
    ).toBe('https://instance.test/api/v1/tracks/track-2/thumbnail?v=track-2');
  });

  it('starts a playlist from its play control', async () => {
    const { onPlay } = await renderCard();

    await fireEvent.press(screen.getByTestId('playlist-play', hidden));

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('disables the play while nothing is stored', async () => {
    await renderCard({
      playlist: {
        ...playlist,
        counts: {
          stored: 0,
          pending: 1,
          downloading: 0,
          failed: 2,
          unavailable: 0
        }
      }
    });

    expect(screen.getByTestId('playlist-play', hidden)).toBeDisabled();
  });

  it('starts a shuffled playlist from its shuffle control', async () => {
    const { onShuffle } = await renderCard();

    await fireEvent.press(screen.getByTestId('playlist-shuffle', hidden));

    expect(onShuffle).toHaveBeenCalledTimes(1);
  });

  it('disables the shuffle while nothing is stored', async () => {
    await renderCard({
      playlist: {
        ...playlist,
        counts: {
          stored: 0,
          pending: 1,
          downloading: 0,
          failed: 2,
          unavailable: 0
        }
      }
    });

    expect(screen.getByTestId('playlist-shuffle', hidden)).toBeDisabled();
  });

  it('holds both starts while one is in flight', async () => {
    await renderCard({ starting: 'shuffle' });

    expect(screen.getByTestId('playlist-play', hidden)).toBeDisabled();
    expect(screen.getByTestId('playlist-shuffle', hidden)).toBeDisabled();
  });

  it('opens the actions from its overflow control', async () => {
    const { onOpenActions } = await renderCard();

    await fireEvent.press(screen.getByTestId('playlist-actions', hidden));

    expect(onOpenActions).toHaveBeenCalledTimes(1);
  });

  it('names the owner of a shared playlist', async () => {
    await renderCard({
      playlist: { ...playlist, access: ShareLevel.Read },
      ownerName: 'Bea'
    });

    expect(screen.getByText('Shared by Bea', hidden)).toBeOnTheScreen();
  });

  it('draws no owner line for an owned playlist', async () => {
    await renderCard({ ownerName: 'Bea' });

    expect(screen.queryByText('Shared by Bea', hidden)).not.toBeOnTheScreen();
  });

  it('draws the incomplete count with its word', async () => {
    await renderCard();

    expect(
      screen.getByText('3 tracks are not stored', hidden)
    ).toBeOnTheScreen();
    expect(screen.queryByText('Pending', hidden)).not.toBeOnTheScreen();
    expect(screen.queryByText('Failed', hidden)).not.toBeOnTheScreen();
  });

  it('counts only the recoverable tracks as not stored', async () => {
    await renderCard({
      playlist: {
        ...playlist,
        counts: {
          stored: 9,
          pending: 0,
          downloading: 0,
          failed: 0,
          unavailable: 4
        }
      }
    });

    expect(
      screen.queryByTestId('playlist-incomplete', hidden)
    ).not.toBeOnTheScreen();
    expect(screen.getByTestId('playlist-gone', hidden)).toHaveTextContent(
      '4 tracks never stored'
    );
    expect(
      screen.getByTestId('playlist-card').props.accessibilityLabel
    ).toContain('4 tracks never stored');
  });

  it('keeps the download marker beside a terminal line', async () => {
    await renderCard({
      playlist: {
        ...playlist,
        counts: {
          stored: 5,
          pending: 1,
          downloading: 0,
          failed: 2,
          unavailable: 4
        }
      }
    });

    expect(
      screen.getByText('3 tracks are not stored', hidden)
    ).toBeOnTheScreen();
    expect(screen.getByTestId('playlist-gone', hidden)).toHaveTextContent(
      '4 tracks never stored'
    );
    const label = screen.getByTestId('playlist-card').props.accessibilityLabel;
    expect(label).toContain('3 tracks are not stored');
    expect(label).toContain('4 tracks never stored');
  });

  it('draws the count, the sync state and the share mark', async () => {
    await renderCard();

    expect(screen.getByText('12 tracks', hidden)).toBeOnTheScreen();
    expect(screen.getByText('Up to date', hidden)).toBeOnTheScreen();
    expect(screen.getByTestId('playlist-share', hidden)).toBeOnTheScreen();
  });

  it('keeps the card one focus stop and offers its actions there', async () => {
    const { onPlay, onShuffle, onOpenActions } = await renderCard();
    const card = screen.getByLabelText(
      'Rain On The Window, Private playlist, 12 tracks, 3 tracks are not stored, Up to date'
    );

    expect(screen.queryByRole('button', { name: /^Play / })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Shuffle / })).toBeNull();
    expect(screen.queryByRole('button', { name: /^More actions/ })).toBeNull();

    await act(async () => {
      for (const actionName of ['play', 'shuffle', 'openActions']) {
        await fireEvent(card, 'accessibilityAction', {
          nativeEvent: { actionName }
        });
      }
    });

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onShuffle).toHaveBeenCalledTimes(1);
    expect(onOpenActions).toHaveBeenCalledTimes(1);
  });

  it('offers no start action while nothing is stored', async () => {
    const { onPlay } = await renderCard({
      playlist: {
        ...playlist,
        counts: {
          stored: 0,
          pending: 1,
          downloading: 0,
          failed: 2,
          unavailable: 0
        }
      }
    });
    const card = screen.getByTestId('playlist-card');

    await act(async () => {
      await fireEvent(card, 'accessibilityAction', {
        nativeEvent: { actionName: 'play' }
      });
    });

    expect(onPlay).not.toHaveBeenCalled();
  });

  it('opens the playlist from the card and states its count, its unkept tracks and its state', async () => {
    const { onOpen } = await renderCard();

    expect(
      screen.getAllByLabelText(
        'Rain On The Window, Private playlist, 12 tracks, 3 tracks are not stored, Up to date'
      )
    ).toHaveLength(1);

    await fireEvent.press(screen.getByTestId('playlist-card'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('names the owner on a shared card', async () => {
    await renderCard({
      playlist: { ...playlist, access: ShareLevel.Read },
      ownerName: 'Bea'
    });

    expect(
      screen.getByLabelText(
        'Rain On The Window, You are a collaborator, 12 tracks, 3 tracks are not stored, Up to date, Shared by Bea'
      )
    ).toBeOnTheScreen();
  });
});
