import { describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react-native';

import {
  type Playlist,
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  type SyncRun,
  SyncRunStatus,
  TrackFileStatus,
  type TrackFileStatusCounts
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import SyncBand from './SyncBand';

const store = { getItem: () => null, setItem: () => {} };

const now = new Date('2026-10-01T12:00:00.000Z');

const playlist: Playlist = {
  id: 'playlist-1',
  ownerAccountId: 'account-1',
  name: 'Rain On The Window',
  coverTrackId: null,
  coverUpdatedAt: null,
  provider: Provider.Youtube,
  sourcePlaylistId: 'PL-demo',
  syncStatus: PlaylistSyncStatus.Idle,
  lastSyncedAt: '2026-09-29T12:00:00.000Z',
  trackCount: 8,
  skipNonMusic: true,
  sort: PlaylistSort.Playlist,
  access: 'owner',
  hasShares: false,
  pinned: false,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z'
};

const run: SyncRun = {
  id: 'run-1',
  playlistId: 'playlist-1',
  status: SyncRunStatus.Completed,
  addedCount: 3,
  retainedCount: 5,
  removedCount: 1,
  failedCount: 0,
  startedAt: '2026-09-29T11:59:00.000Z',
  finishedAt: '2026-09-29T12:00:00.000Z',
  error: null
};

const counts: TrackFileStatusCounts = {
  [TrackFileStatus.Stored]: 5,
  [TrackFileStatus.Pending]: 0,
  [TrackFileStatus.Downloading]: 0,
  [TrackFileStatus.Failed]: 2,
  [TrackFileStatus.Unavailable]: 0
};

async function renderBand(
  overrides: Partial<Parameters<typeof SyncBand>[0]> = {}
) {
  const onSync = jest.fn();
  const onRetryFailed = jest.fn();

  await render(
    <I18nProvider initialLanguage={Language.English} storage={store}>
      <SyncBand
        playlist={playlist}
        run={{ ...run, failedCount: 2 }}
        counts={counts}
        now={now}
        canWrite
        syncing={false}
        onSync={onSync}
        retryingFailed={false}
        onRetryFailed={onRetryFailed}
        {...overrides}
      />
    </I18nProvider>
  );

  return { onSync, onRetryFailed };
}

describe('the sync band', () => {
  it('draws the run counts, the stamp and hides zero cells', async () => {
    await renderBand();

    expect(screen.getByText('Last sync 2 days ago')).toBeOnTheScreen();
    expect(screen.getByLabelText('5 kept')).toBeOnTheScreen();
    expect(screen.getByLabelText('3 added')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 removed')).toBeOnTheScreen();
    expect(screen.getByLabelText('2 failed')).toBeOnTheScreen();
    expect(screen.queryByLabelText('0 kept')).not.toBeOnTheScreen();
    expect(screen.queryByText('Nothing changed')).not.toBeOnTheScreen();
  });

  it('draws the playlist’s retained tracks beside the run counts', async () => {
    await renderBand({ remoteRemoved: 2 });

    expect(
      screen.getByText('2 tracks removed from YouTube are still stored')
    ).toBeOnTheScreen();
  });

  it('says nothing about retention while it holds none', async () => {
    await renderBand();

    expect(
      screen.queryByText(/removed from YouTube are still stored/)
    ).not.toBeOnTheScreen();
  });

  it('says nothing changed when the run drew no count', async () => {
    await renderBand({
      run: {
        ...run,
        addedCount: 0,
        retainedCount: 0,
        removedCount: 0
      },
      counts: {
        ...counts,
        [TrackFileStatus.Failed]: 0
      }
    });

    expect(screen.getByText('Nothing changed')).toBeOnTheScreen();
    expect(screen.queryByTestId('sync-cell-kept')).not.toBeOnTheScreen();
  });

  it('says it is syncing and draws the downloading line while running', async () => {
    await renderBand({
      run: {
        ...run,
        status: SyncRunStatus.Running,
        retainedCount: 0,
        addedCount: 0,
        removedCount: 0,
        finishedAt: null
      },
      counts: {
        ...counts,
        [TrackFileStatus.Failed]: 0,
        [TrackFileStatus.Downloading]: 2
      }
    });

    expect(screen.getByText('Syncing')).toBeOnTheScreen();
    expect(screen.getByText('2 downloading')).toBeOnTheScreen();
    expect(screen.queryByText('Nothing changed')).not.toBeOnTheScreen();
  });

  it('replaces the summary with the failure, the count and the raw error', async () => {
    const { onSync } = await renderBand({
      playlist: { ...playlist, syncStatus: PlaylistSyncStatus.Error },
      run: {
        ...run,
        status: SyncRunStatus.Failed,
        error: 'yt-dlp: HTTP 403'
      }
    });

    expect(
      screen.getByText(
        'Could not reach YouTube, the playlist may not be up to date.'
      )
    ).toBeOnTheScreen();
    expect(screen.getByText(/All 5 tracks are still here/)).toBeOnTheScreen();
    expect(screen.queryByTestId('sync-cell-kept')).not.toBeOnTheScreen();
    expect(screen.getByTestId('sync-error-reveal')).toHaveStyle({
      minHeight: 48
    });

    await act(async () => {
      await fireEvent.press(screen.getByTestId('sync-error-reveal'));
    });
    await waitFor(() => {
      expect(screen.getByText('yt-dlp: HTTP 403')).toBeOnTheScreen();
    });
    expect(screen.getByText('Hide details')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('sync-error-retry'));
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('draws no retry for a read collaborator', async () => {
    await renderBand({
      canWrite: false,
      playlist: { ...playlist, syncStatus: PlaylistSyncStatus.Error }
    });

    expect(screen.queryByTestId('sync-error-retry')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('sync-retry-failed')).not.toBeOnTheScreen();
    expect(screen.getByText(/Could not reach YouTube/)).toBeOnTheScreen();
  });

  it('retries the failed set', async () => {
    const { onRetryFailed } = await renderBand();

    expect(screen.getByText('Retry all 2 failed tracks')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('sync-retry-failed'));
    expect(onRetryFailed).toHaveBeenCalledTimes(1);
  });

  it('reports the failed set waiting', async () => {
    await renderBand({ retryingFailed: true });

    expect(
      screen.getByText('Retrying all 2 failed tracks...')
    ).toBeOnTheScreen();
    expect(screen.getByTestId('sync-retry-failed')).toBeDisabled();
  });

  it('renders the failure in French', async () => {
    await render(
      <I18nProvider initialLanguage={Language.French} storage={store}>
        <SyncBand
          playlist={{ ...playlist, syncStatus: PlaylistSyncStatus.Error }}
          run={{ ...run, status: SyncRunStatus.Failed, error: 'yt-dlp: 403' }}
          counts={counts}
          now={now}
          canWrite
          syncing={false}
          onSync={jest.fn()}
          retryingFailed={false}
          onRetryFailed={jest.fn()}
        />
      </I18nProvider>
    );

    expect(
      screen.getByText(/Impossible d'atteindre YouTube/)
    ).toBeOnTheScreen();
    expect(screen.getByText('Afficher les détails')).toBeOnTheScreen();
  });

  it('renders the no-changes summary in French', async () => {
    await render(
      <I18nProvider initialLanguage={Language.French} storage={store}>
        <SyncBand
          playlist={playlist}
          run={{ ...run, addedCount: 0, retainedCount: 0, removedCount: 0 }}
          counts={{ ...counts, [TrackFileStatus.Failed]: 0 }}
          now={now}
          canWrite
          syncing={false}
          onSync={jest.fn()}
          retryingFailed={false}
          onRetryFailed={jest.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Aucun changement')).toBeOnTheScreen();
  });
});
