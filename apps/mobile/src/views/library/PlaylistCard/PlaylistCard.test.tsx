import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import {
  PlaylistSort,
  PlaylistSyncStatus,
  type PlaylistWithCounts,
  Provider,
  ShareLevel
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import { sleeveColor } from '../../../shared/styles/sleeve';

import type { ApiConfig } from '../../../auth/useApiConfig';
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
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z'
};

async function renderCard(overrides: Partial<PlaylistCardProps> = {}) {
  const onOpen = jest.fn();
  const onOpenActions = jest.fn();
  const props: PlaylistCardProps = {
    playlist,
    ownerName: null,
    config,
    onOpen,
    onOpenActions,
    ...overrides
  };

  await render(
    <I18nProvider initialLanguage={Language.English} storage={store}>
      <PlaylistCard {...props} />
    </I18nProvider>
  );

  return { onOpen, onOpenActions };
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
    ).toBe('https://instance.test/api/v1/tracks/track-1/thumbnail');

    await fireEvent(
      screen.getByTestId('playlist-cover-image', hidden),
      'error'
    );

    expect(
      screen.queryByTestId('playlist-cover-image', hidden)
    ).not.toBeOnTheScreen();
    expect(screen.getByTestId('playlist-cover', hidden)).toHaveStyle({
      backgroundColor: sleeveColor(playlist.id)
    });
  });

  it('draws a disabled play control named for its playlist', async () => {
    await renderCard();

    expect(
      screen.getByRole('button', { name: 'Play Rain On The Window' })
    ).toBeDisabled();
  });

  it('opens the actions from its overflow control', async () => {
    const { onOpenActions } = await renderCard();

    fireEvent.press(
      screen.getByRole('button', {
        name: 'More actions for Rain On The Window'
      })
    );

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

  it('draws the incomplete count without a breakdown', async () => {
    await renderCard();

    expect(screen.getByText('3', hidden)).toBeOnTheScreen();
    expect(screen.queryByText('Pending', hidden)).not.toBeOnTheScreen();
    expect(screen.queryByText('Failed', hidden)).not.toBeOnTheScreen();
  });

  it('draws the count, the sync state and the share mark', async () => {
    await renderCard();

    expect(screen.getByText('12 tracks', hidden)).toBeOnTheScreen();
    expect(screen.getByText('Up to date', hidden)).toBeOnTheScreen();
    expect(screen.getByTestId('playlist-share', hidden)).toBeOnTheScreen();
  });

  it('opens the playlist from the card and announces it once with its name', async () => {
    const { onOpen } = await renderCard();

    expect(screen.getAllByLabelText('Rain On The Window')).toHaveLength(1);

    fireEvent.press(screen.getByTestId('playlist-card'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
