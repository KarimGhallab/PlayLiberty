import { describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  AddTrackOutcome,
  type AddTrackResult,
  type Playlist,
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  ShareLevel
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import AddTrackSheet, { type AddTrackSheetProps } from './AddTrackSheet';

const store = { getItem: () => null, setItem: () => {} };

/* Modal renders are slow under the parallel run. */
jest.setTimeout(15000);

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

const link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

function playlist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'playlist-1',
    ownerAccountId: 'account-1',
    name: 'Rain On The Window',
    coverTrackId: null,
    coverUpdatedAt: null,
    provider: Provider.Youtube,
    sourcePlaylistId: 'PL-demo',
    syncStatus: PlaylistSyncStatus.Idle,
    lastSyncedAt: '2026-09-29T12:00:00.000Z',
    trackCount: 3,
    skipNonMusic: true,
    sort: PlaylistSort.Playlist,
    access: 'owner',
    hasShares: false,
    pinned: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-29T12:00:00.000Z',
    ...overrides
  };
}

const current = playlist({ name: 'Rain On The Window' });
const other = playlist({
  id: 'playlist-2',
  name: 'Late Night Jazz',
  access: ShareLevel.Write
});

function sheetElement(props: AddTrackSheetProps) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <AddTrackSheet {...props} />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

async function renderSheet(overrides: Partial<AddTrackSheetProps> = {}) {
  const props: AddTrackSheetProps = {
    visible: true,
    currentPlaylist: current,
    playlists: [other, current],
    firstPageLimit: 200,
    truncated: false,
    busy: false,
    problem: null,
    result: null,
    onSubmit: jest.fn(),
    onClose: jest.fn(),
    ...overrides
  };

  await render(sheetElement(props));

  return { props };
}

/* React 19 defers the state an event writes, so the test waits for the field to
 * hold what was typed before pressing a control that reads it. */
async function typeLink(value: string) {
  await fireEvent.changeText(screen.getByLabelText('Video link'), value);

  await waitFor(
    () => {
      expect(screen.getByLabelText('Video link')).toHaveDisplayValue(value);
    },
    { timeout: 3000 }
  );
}

async function pressAdd() {
  const add = screen.getByRole('button', { name: 'Add' });

  await waitFor(
    () => {
      expect(add).toBeEnabled();
    },
    { timeout: 3000 }
  );
  await fireEvent.press(add);
}

describe('the add-track sheet', () => {
  it('leads with the current playlist and preselects only it', async () => {
    await renderSheet();

    const boxes = within(screen.getByTestId('add-track-pick')).getAllByRole(
      'checkbox'
    );

    expect(boxes.map(box => box.props.accessibilityLabel)).toEqual([
      'Rain On The Window',
      'Late Night Jazz'
    ]);
    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).not.toBeChecked();
  });

  it('submits the link and the chosen playlists in the order chosen', async () => {
    const { props } = await renderSheet();

    await typeLink(` ${link} `);
    await fireEvent.press(screen.getByTestId('add-track-pick-playlist-2'));
    await pressAdd();

    expect(props.onSubmit).toHaveBeenCalledWith(link, [
      'playlist-1',
      'playlist-2'
    ]);
  });

  it('refuses a malformed link and a playlist link before a request', async () => {
    const { props } = await renderSheet();

    await typeLink('not a url');
    await pressAdd();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Paste a YouTube video link/
      );
    });
    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('add-track-sheet')).toBeOnTheScreen();

    await typeLink('https://youtube.com/playlist?list=PL-demo');
    await pressAdd();

    expect(props.onSubmit).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Paste a YouTube video link/
      );
    });
  });

  it('asks before a typed link is discarded', async () => {
    const { props } = await renderSheet();

    await typeLink(link);
    await fireEvent.press(screen.getByTestId('add-track-backdrop'));

    await waitFor(() => {
      expect(screen.getByText(/Discard this link\?/)).toBeOnTheScreen();
    });
    expect(props.onClose).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('add-track-keep-editing'));

    await waitFor(() => {
      expect(screen.queryByText(/Discard this link\?/)).not.toBeOnTheScreen();
    });
    expect(screen.getByLabelText('Video link')).toHaveDisplayValue(link);

    await fireEvent.press(screen.getByTestId('add-track-backdrop'));
    await waitFor(() => {
      expect(screen.getByTestId('add-track-discard')).toBeOnTheScreen();
    });
    await fireEvent.press(screen.getByTestId('add-track-discard'));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('draws one outcome per chosen playlist in the order chosen', async () => {
    const result: AddTrackResult = {
      results: [
        { playlistId: 'playlist-1', outcome: AddTrackOutcome.Added },
        {
          playlistId: 'playlist-2',
          outcome: AddTrackOutcome.AlreadyPresent
        }
      ]
    };
    await renderSheet({ result });

    const rows = screen.getAllByTestId(/^add-track-outcome-/);

    expect(rows.map(row => row.props.testID)).toEqual([
      'add-track-outcome-playlist-1',
      'add-track-outcome-playlist-2'
    ]);
    const first = screen.getByTestId('add-track-outcome-playlist-1');
    const second = screen.getByTestId('add-track-outcome-playlist-2');

    expect(within(first).getByText('Rain On The Window')).toBeOnTheScreen();
    expect(within(first).getByText('Added')).toBeOnTheScreen();
    expect(within(second).getByText('Late Night Jazz')).toBeOnTheScreen();
    expect(within(second).getByText('Already there')).toBeOnTheScreen();
  });

  it('names a refused playlist and gives no cause', async () => {
    const result: AddTrackResult = {
      results: [{ playlistId: 'playlist-1', outcome: AddTrackOutcome.Refused }]
    };
    await renderSheet({ result });

    const row = screen.getByTestId('add-track-outcome-playlist-1');

    expect(within(row).getByText('Rain On The Window')).toBeOnTheScreen();
    expect(within(row).getByText('Refused')).toBeOnTheScreen();
    expect(within(row).getAllByText(/.+/)).toHaveLength(2);
  });

  it('names the first page only when the read is cut', async () => {
    await renderSheet({ truncated: true, firstPageLimit: 200 });

    expect(
      screen.getByText(
        'Only the first 200 playlists in the library are listed.'
      )
    ).toBeOnTheScreen();
  });

  it('draws no first-page note when every playlist is present', async () => {
    await renderSheet();

    expect(screen.queryByTestId('add-track-first-page')).not.toBeOnTheScreen();
  });

  it('locks the link and the picker while the batch runs', async () => {
    const { props } = await renderSheet({ busy: true });

    expect(screen.getByTestId('add-track-url')).toBeDisabled();
    expect(screen.getByTestId('add-track-pick-playlist-1')).toBeDisabled();

    const adding = screen.getByRole('button', { name: 'Adding' });
    expect(adding).toBeDisabled();

    await fireEvent.press(adding);
    expect(props.onSubmit).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('add-track-backdrop'));
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('renders the sheet and its outcomes in French', async () => {
    const result: AddTrackResult = {
      results: [
        { playlistId: 'playlist-1', outcome: AddTrackOutcome.Added },
        {
          playlistId: 'playlist-2',
          outcome: AddTrackOutcome.AlreadyPresent
        },
        { playlistId: 'playlist-3', outcome: AddTrackOutcome.Refused }
      ]
    };
    const third = playlist({
      id: 'playlist-3',
      name: 'Trajet du matin',
      access: ShareLevel.Write
    });

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <I18nProvider initialLanguage={Language.French} storage={store}>
          <AddTrackSheet
            visible
            currentPlaylist={current}
            playlists={[other, third]}
            firstPageLimit={200}
            truncated
            busy={false}
            problem={null}
            result={result}
            onSubmit={jest.fn()}
            onClose={jest.fn()}
          />
        </I18nProvider>
      </SafeAreaProvider>
    );

    expect(screen.getByText('Ajouter une piste')).toBeOnTheScreen();
    expect(screen.getByText('Lien de la vidéo')).toBeOnTheScreen();
    expect(screen.getByText('Playlists')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Seules les 200 premières playlists de la bibliothèque sont listées.'
      )
    ).toBeOnTheScreen();
    expect(screen.getByText('Ajoutée')).toBeOnTheScreen();
    expect(screen.getByText('Déjà présente')).toBeOnTheScreen();
    expect(screen.getByText('Refusée')).toBeOnTheScreen();
  });
});
